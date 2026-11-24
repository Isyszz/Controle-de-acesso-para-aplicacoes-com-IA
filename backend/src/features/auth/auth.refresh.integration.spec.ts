import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  users,
  userTokens,
  userCredentials,
  auditEvents,
} from '../../infrastructure/database/schema.js';
import { eq, or } from 'drizzle-orm';
import { hash } from 'argon2';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.refresh (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          or(
            eq(users.email, 'refresh.test@exemplo'),
            eq(users.email, 'refresh.expired@exemplo'),
            eq(users.email, 'refresh.limit@exemplo'),
            eq(users.email, 'refresh.valid@exemplo'),
          ),
        );
      for (const user of testUsers) {
        await db
          .delete(userCredentials)
          .where(eq(userCredentials.userId, user.id));
        await db.delete(userTokens).where(eq(userTokens.userId, user.id));
        await db
          .delete(auditEvents)
          .where(eq(auditEvents.actorUserId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
      }
    });

    it('deve rejeitar refresh de sessão inexistente (C-09)', async () => {
      await expect(service.refresh('sessao-inexistente')).rejects.toThrow(
        AppError,
      );
    });

    it('deve rejeitar refresh de sessão revogada (C-09)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'refresh.test@exemplo',
          name: 'Refresh Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-revoked-refresh',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        sessionStart: new Date(),
      });

      await expect(service.refresh('sessao-revogada-refresh')).rejects.toThrow(
        AppError,
      );
    });

    it('deve rejeitar refresh de sessão expirada (C-10)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'refresh.expired@exemplo',
          name: 'Refresh Expired User',
          status: 'active',
        })
        .returning();

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-expired-refresh',
        createdAt: new Date(Date.now() - 7200000),
        lastActivityAt: new Date(Date.now() - 7200000),
        expiresAt: new Date(Date.now() - 3600000),
        revokedAt: null,
        sessionStart: new Date(Date.now() - 7200000),
      });

      await expect(service.refresh('sessao-expirada-refresh')).rejects.toThrow(
        AppError,
      );
    });

    it('deve rejeitar refresh após limite absoluto de 8 horas (C-10)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'refresh.limit@exemplo',
          name: 'Refresh Limit User',
          status: 'active',
        })
        .returning();

      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);
      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-limit-refresh',
        createdAt: nineHoursAgo,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        sessionStart: nineHoursAgo,
      });

      await expect(service.refresh('sessao-limite-refresh')).rejects.toThrow(
        AppError,
      );
    });

    it('deve renovar sessão com rotação de segredo (C-09)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'refresh.valid@exemplo',
          name: 'Refresh Valid User',
          status: 'active',
        })
        .returning();

      const senhaCorreta = 'senha_refresh_123';
      const senhaHash = await hash(senhaCorreta);

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const loginResult = await service.login({
        email: 'refresh.valid@exemplo',
        password: senhaCorreta,
      });

      expect(loginResult.sessionSecret).toBeDefined();
      expect(loginResult.sessionId).toBeDefined();

      const refreshed = await service.refresh(loginResult.sessionSecret);

      expect(refreshed.sessionSecret).toBeDefined();
      expect(refreshed.csrfToken).toBeDefined();
      expect(refreshed.sessionSecret).not.toBe(loginResult.sessionSecret);

      const oldSession = await service.validateSession(
        loginResult.sessionSecret,
      );
      expect(oldSession).toBeNull();

      const newSession = await service.validateSession(refreshed.sessionSecret);
      expect(newSession).toBeDefined();
      expect(newSession.userId).toBe(user.id);
    });
  },
);
