import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import { AppError } from '../../shared/errors/app-error.js';
import { redactMetadata } from '../../shared/errors/sensitive-fields.js';
import { getTraceId } from '../../shared/trace/trace.context.js';
import { getDb, type Db } from '../../infrastructure/database/index.js';
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
import { AuditEventInput } from '../../features/audit/audit.types.js';

const SESSION_TTL_MINUTES =
  Number(process.env.SESSION_TTL_MINUTES ?? 30) * 60 * 1000;
const SESSION_ABSOLUTE_HOURS = Number(process.env.SESSION_ABSOLUTE_HOURS ?? 8);
const CSRF_SECRET_ENV = process.env.CSRF_SECRET;
if (!CSRF_SECRET_ENV) {
  throw new Error('CSRF_SECRET não definida. Configure o arquivo .env.');
}
const CSRF_SECRET: string = CSRF_SECRET_ENV;

type LoginTxResult =
  | {
      kind: 'success';
      userId: string;
      email: string;
      name: string;
      csrfToken: string;
      sessionSecret: string;
      sessionId: string;
    }
  | {
      kind: 'failure';
      statusCode: number;
      reasonCode: string;
      actorUserId: string | undefined;
    };

type LoginTx = Parameters<Parameters<Db['transaction']>[0]>[0];

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

  private async recordAudit(input: AuditEventInput): Promise<void> {
    await this.auditService.record({
      ...input,
      metadata: redactMetadata(input.metadata),
    });
  }

  async login(input: LoginInput): Promise<LoginOutput> {
    const db = getDb();
    const traceId = getTraceId() ?? '';

    const result = await db.transaction(async (tx) => {
      return this.executeLoginTransaction(tx, input, traceId);
    });

    const baseAudit = {
      traceId,
      action: 'login',
      toolName: 'login',
      metadata: { email: input.email },
    } as const;

    if (result.kind === 'failure') {
      await this.recordAudit({
        ...baseAudit,
        eventType: 'auth.login.failed',
        decision: 'negado' as const,
        sessionId: undefined,
        reasonCode: result.reasonCode,
        actorUserId: result.actorUserId,
      });
      throw new AppError(
        'AUTH_INVALID_CREDENTIALS',
        'Credenciais inválidas.',
        result.statusCode,
      );
    }

    // Auditoria de sucesso somente após o commit da transação.
    try {
      await this.recordAudit({
        ...baseAudit,
        eventType: 'auth.login.succeeded',
        decision: 'permitido',
        reasonCode: 'CREDENTIALS_VALID',
        actorUserId: result.userId,
        sessionId: result.sessionId,
      });
    } catch {
      // Se a auditoria falhar, retorna erro 500 sem tentar revogar a sessão.
      throw new AppError('AUTH_AUDIT_FAILED', 'Falha interna ao registrar auditoria.', 500);
    }

    return {
      userId: result.userId,
      email: result.email,
      name: result.name,
      csrfToken: result.csrfToken,
      sessionSecret: result.sessionSecret,
      sessionId: result.sessionId,
    };
  }

  private async executeLoginTransaction(
    tx: LoginTx,
    input: LoginInput,
    traceId: string,
  ): Promise<LoginTxResult> {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    if (!user) {
      return {
        kind: 'failure',
        statusCode: 401,
        reasonCode: 'INVALID_CREDENTIALS',
        actorUserId: undefined,
      };
    }

    if (user.status !== 'active') {
      // Conta desabilitada: incrementa apenas se existir credencial associada.
      const [credential] = await tx
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id))
        .for('update');

      if (credential) {
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
          .where(eq(userCredentials.userId, user.id));
      }

      return {
        kind: 'failure',
        statusCode: 401,
        reasonCode: 'ACCOUNT_DISABLED',
        actorUserId: user.id,
      };
    }

    const [credential] = await tx
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, user.id))
      .for('update');

    if (!credential) {
      // Não existe registro em user_credentials: não há contador para incrementar.
      return {
        kind: 'failure',
        statusCode: 401,
        reasonCode: 'INVALID_CREDENTIALS',
        actorUserId: user.id,
      };
    }

    if (
      credential.lockedUntil &&
      new Date(credential.lockedUntil) > new Date()
    ) {
      return {
        kind: 'failure',
        statusCode: 401,
        reasonCode: 'ACCOUNT_LOCKED',
        actorUserId: user.id,
      };
    }

    const passwordValid = await verify(
      credential.passwordHash,
      input.password,
    );

    if (!passwordValid) {
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
        .where(eq(userCredentials.userId, user.id));

      return {
        kind: 'failure',
        statusCode: 401,
        reasonCode: 'INVALID_CREDENTIALS',
        actorUserId: user.id,
      };
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

    return {
      kind: 'success',
      userId: user.id,
      email: user.email,
      name: user.name,
      csrfToken,
      sessionSecret,
      sessionId: createdSession.id,
    };
  }

  async logout(sessionHash: string): Promise<void> {
    const db = getDb();
    const secretHash = computeSecretHash(sessionHash);

    const [session] = await db
      .select()
      .from(userTokens)
      .where(
        and(
          eq(userTokens.secretHash, secretHash),
          isNull(userTokens.revokedAt),
        ),
      );

    if (session) {
      await db
        .update(userTokens)
        .set({ revokedAt: new Date() })
        .where(eq(userTokens.id, session.id));

      await this.auditService.record({
        traceId: getTraceId() ?? '',
        eventType: 'auth.logout',
        actorUserId: session.userId,
        sessionId: session.id,
        action: 'logout',
        resourceType: 'session',
        resourceId: session.id,
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
  }

  async refresh(sessionHash: string): Promise<TokenPair> {
    const db = getDb();
    const secretHash = computeSecretHash(sessionHash);

    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(userTokens)
        .where(
          and(
            eq(userTokens.secretHash, secretHash),
            isNull(userTokens.revokedAt),
          ),
        );

      if (!session) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: undefined,
          sessionId: undefined,
          action: 'refresh',
          resourceType: 'session',
          resourceId: undefined,
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

      if (new Date(session.expiresAt) <= new Date()) {
        await this.auditService.record({
          traceId: getTraceId() ?? '',
          eventType: 'auth.refresh.failed',
          actorUserId: session.userId,
          sessionId: session.id,
          action: 'refresh',
          resourceType: 'session',
          resourceId: session.id,
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
          sessionId: session.id,
          action: 'refresh',
          resourceType: 'session',
          resourceId: session.id,
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
        .where(eq(userTokens.id, session.id));

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

  async me(sessionHash: string): Promise<AuthUser> {
    const db = getDb();
    const secretHash = computeSecretHash(sessionHash);

    const [session] = await db
      .select()
      .from(userTokens)
      .where(
        and(
          eq(userTokens.secretHash, secretHash),
          isNull(userTokens.revokedAt),
        ),
      );

    if (!session) {
      throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
    }

    if (new Date(session.expiresAt) <= new Date()) {
      throw new AppError('AUTH_SESSION_INVALID', 'Sessão inválida.', 401);
    }

    const absoluteLimit = new Date(
      session.sessionStart.getTime() + SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000,
    );
    if (new Date() > absoluteLimit) {
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
      .where(eq(userTokens.id, session.id));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    };
  }

  async validateSession(sessionHash: string): Promise<AuthSession | null> {
    const db = getDb();
    const secretHash = computeSecretHash(sessionHash);

    const [session] = await db
      .select()
      .from(userTokens)
      .where(
        and(
          eq(userTokens.secretHash, secretHash),
          isNull(userTokens.revokedAt),
        ),
      );

    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt) <= new Date()) {
      return null;
    }

    const absoluteLimit = new Date(
      session.sessionStart.getTime() + SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000,
    );
    if (new Date() > absoluteLimit) {
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
