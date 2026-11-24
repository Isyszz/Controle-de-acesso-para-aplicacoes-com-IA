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
  'AuthService.me (integração - requer DATABASE_URL_TEST)',
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
            eq(users.email, 'me.test@exemplo'),
            eq(users.email, 'me.revoked@exemplo'),
            eq(users.email, 'me.disabled@exemplo'),
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

    it('deve retornar dados do usuário autenticado (C-11)', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_me_test_123';
      const senhaHash = await hash(senhaCorreta);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: 'me.test@exemplo',
          name: 'Me Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: createdUser.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const result = await service.login({
        email: 'me.test@exemplo',
        password: senhaCorreta,
      });

      expect(result.userId).toBe(createdUser.id);

      const resultado = await service.me(result.sessionSecret);

      expect(resultado.id).toBe(createdUser.id);
      expect(resultado.email).toBe('me.test@exemplo');
      expect(resultado.name).toBe('Me Test User');
      expect(resultado.status).toBe('active');
      expect(resultado.passwordHash).toBeUndefined();
      expect(resultado.secretHash).toBeUndefined();
    });

    it('deve rejeitar sessão inexistente em /auth/me (C-12)', async () => {
      await expect(service.me('sessao-inexistente-me')).rejects.toThrow(
        AppError,
      );
    });

    it('deve rejeitar sessão revogada em /auth/me (C-13)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'me.revoked@exemplo',
          name: 'Me Revoked User',
          status: 'active',
        })
        .returning();

      const secretHash = 'hash-me-revoked';
      await db.insert(userTokens).values({
        userId: user.id,
        secretHash,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        sessionStart: new Date(),
      });

      await expect(service.me(secretHash)).rejects.toThrow(AppError);
    });

    it('deve rejeitar usuário desativado em /auth/me (C-14)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'me.disabled@exemplo',
          name: 'Me Disabled User',
          status: 'inactive',
        })
        .returning();

      const secretHash = 'hash-me-disabled';
      await db.insert(userTokens).values({
        userId: user.id,
        secretHash,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        sessionStart: new Date(),
      });

      await expect(service.me(secretHash)).rejects.toThrow(AppError);
    });
  },
);
