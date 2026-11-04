import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import { AppError } from '../../shared/errors/app-error.js';
import { redactMetadata } from '../../shared/errors/sensitive-fields.js';
import { getTraceId } from '../../shared/trace/trace.context.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  userCredentials,
  userTokens,
  users,
} from '../../infrastructure/database/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import {
  LoginInput,
  LoginOutput,
  AuthSession,
  AuthUser,
  TokenPair,
} from './auth.types.js';
import { AuditService } from '../../features/audit/audit.service.js';

const SESSION_TTL_MINUTES =
  Number(process.env.SESSION_TTL_MINUTES ?? 30) * 60 * 1000;
const SESSION_ABSOLUTE_HOURS = Number(process.env.SESSION_ABSOLUTE_HOURS ?? 8);
const CSRF_SECRET_ENV = process.env.CSRF_SECRET;
if (!CSRF_SECRET_ENV) {
  throw new Error('CSRF_SECRET não definida. Configure o arquivo .env.');
}
const CSRF_SECRET: string = CSRF_SECRET_ENV;

function generateSessionSecret(): string {
  return randomUUID();
}

function computeSecretHash(secret: string): string {
  return createHmac('sha256', CSRF_SECRET).update(secret).digest('hex');
}

function computeCsrfToken(sessionId: string): string {
  return createHmac('sha256', CSRF_SECRET).update(sessionId).digest('hex');
}

function nowMs(): number {
  return Date.now();
}

@Injectable()
export class AuthService {
  constructor(private readonly auditService: AuditService) {}

  private async recordAudit(
    tx: any,
    eventType: string,
    action: string,
    decision: 'permitido' | 'negado',
    reasonCode: string,
    userId: string | null,
    sessionId: string | null,
    toolName: string | null,
    metadata: Record<string, unknown> | undefined,
  ): Promise<void> {
    await this.auditService.record({
      traceId: getTraceId() ?? '',
      eventType,
      actorUserId: userId ?? undefined,
      sessionId: sessionId ?? undefined,
      action,
      resourceType: 'session',
      resourceId: sessionId ?? undefined,
      permissionCode: undefined,
      policyId: undefined,
      decision,
      reasonCode,
      toolName: toolName ?? undefined,
      status: undefined,
      durationMs: undefined,
      metadata: redactMetadata(metadata),
    });
  }

  async login(input: LoginInput): Promise<LoginOutput> {
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (!user) {
        await this.recordFailedAttempt(tx, null);
        await this.recordAudit(
          tx,
          'auth.login.failed',
          'login',
          'negado',
          'INVALID_CREDENTIALS',
          null,
          null,
          'login',
          { email: input.email },
        );
        throw new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
          401,
        );
      }

      if (user.status !== 'active') {
        await this.recordFailedAttempt(tx, user.id);
        await this.recordAudit(
          tx,
          'auth.login.failed',
          'login',
          'negado',
          'ACCOUNT_DISABLED',
          user.id,
          null,
          'login',
          { email: input.email },
        );
        throw new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
          401,
        );
      }

      const [credential] = await tx
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      if (!credential) {
        await this.recordFailedAttempt(tx, user.id);
        await this.recordAudit(
          tx,
          'auth.login.failed',
          'login',
          'negado',
          'INVALID_CREDENTIALS',
          user.id,
          null,
          'login',
          { email: input.email },
        );
        throw new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
          401,
        );
      }

      if (
        credential.lockedUntil &&
        new Date(credential.lockedUntil) > new Date()
      ) {
        await this.recordAudit(
          tx,
          'auth.login.failed',
          'login',
          'negado',
          'ACCOUNT_LOCKED',
          user.id,
          null,
          'login',
          { email: input.email },
        );
        throw new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
          401,
        );
      }

      const passwordValid = await verify(
        credential.passwordHash,
        input.password,
      );

      if (!passwordValid) {
        await this.recordFailedAttempt(tx, user.id);
        await this.recordAudit(
          tx,
          'auth.login.failed',
          'login',
          'negado',
          'INVALID_CREDENTIALS',
          user.id,
          null,
          'login',
          { email: input.email },
        );
        throw new AppError(
          'AUTH_INVALID_CREDENTIALS',
          'Credenciais inválidas.',
          401,
        );
      }

      await tx
        .update(userCredentials)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(userCredentials.userId, user.id));

      const sessionSecret = generateSessionSecret();
      const secretHash = computeSecretHash(sessionSecret);
      const sessionStart = new Date();
      const expiresAt = new Date(nowMs() + SESSION_TTL_MINUTES);

      const [createdSession] = await tx
        .insert(userTokens)
        .values({
          userId: user.id,
          secretHash,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt,
          revokedAt: null,
          sessionStart,
        })
        .returning();

      const csrfToken = computeCsrfToken(createdSession.id);

      await this.recordAudit(
        tx,
        'auth.login.succeeded',
        'login',
        'permitido',
        'CREDENTIALS_VALID',
        user.id,
        createdSession.id,
        'login',
        { email: input.email },
      );

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        csrfToken,
        sessionSecret,
        sessionId: createdSession.id,
      };
    });

    return {
      userId: result.userId,
      email: result.email,
      name: result.name,
      csrfToken: result.csrfToken,
      sessionSecret: result.sessionSecret,
    };
  }

  private async recordFailedAttempt(
    tx: any,
    userId: string | null,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    const [credential] = await tx
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId));

    if (!credential) {
      return;
    }

    const newAttempts = credential.failedLoginAttempts + 1;
    const lockedUntil =
      newAttempts >= 5 ? new Date(nowMs() + 15 * 60 * 1000) : null;

    await tx
      .update(userCredentials)
      .set({
        failedLoginAttempts: newAttempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(userCredentials.userId, userId));
  }

  async logout(sessionId: string): Promise<void> {
    const db = getDb();

    await db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(eq(userTokens.id, sessionId));

    await this.auditService.record({
      traceId: getTraceId() ?? '',
      eventType: 'auth.logout',
      actorUserId: undefined,
      sessionId,
      action: 'logout',
      resourceType: 'session',
      resourceId: sessionId,
      permissionCode: undefined,
      policyId: undefined,
      decision: 'permitido',
      reasonCode: 'USER_LOGOUT',
      toolName: 'logout',
      status: undefined,
      durationMs: undefined,
      metadata: undefined,
    });
  }

  async refresh(sessionId: string): Promise<TokenPair> {
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(userTokens)
        .where(eq(userTokens.id, sessionId));

      if (!session) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: undefined,
          sessionId,
          action: 'refresh',
          resourceType: 'session',
          resourceId: sessionId,
          permissionCode: undefined,
          policyId: undefined,
          decision: 'negado',
          reasonCode: 'SESSION_INVALID',
          toolName: 'refresh',
          status: undefined,
          durationMs: undefined,
          metadata: undefined,
        });
        throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
      }

      if (session.revokedAt) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: session.userId,
          sessionId,
          action: 'refresh',
          resourceType: 'session',
          resourceId: sessionId,
          permissionCode: undefined,
          policyId: undefined,
          decision: 'negado',
          reasonCode: 'SESSION_REVOKED',
          toolName: 'refresh',
          status: undefined,
          durationMs: undefined,
          metadata: undefined,
        });
        throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
      }

      if (new Date(session.expiresAt) <= new Date()) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: session.userId,
          sessionId,
          action: 'refresh',
          resourceType: 'session',
          resourceId: sessionId,
          permissionCode: undefined,
          policyId: undefined,
          decision: 'negado',
          reasonCode: 'SESSION_EXPIRED',
          toolName: 'refresh',
          status: undefined,
          durationMs: undefined,
          metadata: undefined,
        });
        throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
      }

      const absoluteLimit = new Date(
        session.sessionStart.getTime() +
          SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000,
      );
      if (new Date() > absoluteLimit) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: session.userId,
          sessionId,
          action: 'refresh',
          resourceType: 'session',
          resourceId: sessionId,
          permissionCode: undefined,
          policyId: undefined,
          decision: 'negado',
          reasonCode: 'SESSION_ABSOLUTE_LIMIT_EXCEEDED',
          toolName: 'refresh',
          status: undefined,
          durationMs: undefined,
          metadata: undefined,
        });
        throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
      }

      await tx
        .update(userTokens)
        .set({ revokedAt: new Date() })
        .where(eq(userTokens.id, sessionId));

      const newSecret = generateSessionSecret();
      const newSecretHash = computeSecretHash(newSecret);
      const newExpiresAt = new Date(nowMs() + SESSION_TTL_MINUTES);

      const [newSession] = await tx
        .insert(userTokens)
        .values({
          userId: session.userId,
          secretHash: newSecretHash,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: newExpiresAt,
          revokedAt: null,
          sessionStart: session.sessionStart,
        })
        .returning();

      const csrfToken = computeCsrfToken(newSession.id);

      await this.auditService.record({
        traceId: getTraceId() ?? '',
        eventType: 'auth.refresh.succeeded',
        actorUserId: session.userId,
        sessionId: newSession.id,
        action: 'refresh',
        resourceType: 'session',
        resourceId: newSession.id,
        permissionCode: undefined,
        policyId: undefined,
        decision: 'permitido',
        reasonCode: 'SESSION_RENEWED',
        toolName: 'refresh',
        status: undefined,
        durationMs: undefined,
        metadata: undefined,
      });

      return {
        sessionSecret: newSecret,
        csrfToken,
      };
    });

    return {
      sessionSecret: result.sessionSecret,
      csrfToken: result.csrfToken,
    };
  }

  async me(sessionId: string): Promise<AuthUser> {
    const db = getDb();

    const [session] = await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.id, sessionId));

    if (!session || session.revokedAt) {
      throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
    }

    if (new Date(session.expiresAt) <= new Date()) {
      throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user || user.status !== 'active') {
      throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
    }

    await db
      .update(userTokens)
      .set({ lastActivityAt: new Date() })
      .where(eq(userTokens.id, sessionId));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    };
  }

  async validateSession(sessionId: string): Promise<AuthSession | null> {
    const db = getDb();

    const [session] = await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.id, sessionId));

    if (!session || session.revokedAt) {
      return null;
    }

    if (new Date(session.expiresAt) <= new Date()) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      secretHash: session.secretHash,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      sessionStart: session.sessionStart,
    };
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    const db = getDb();

    await db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(userTokens.userId, userId), isNull(userTokens.revokedAt)));
  }
}
