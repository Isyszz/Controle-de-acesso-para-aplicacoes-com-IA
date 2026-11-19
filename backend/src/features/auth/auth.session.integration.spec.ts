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
  'AuthService.session (integração - requer DATABASE_URL_TEST)',
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
            eq(users.email, 'session.test@exemplo'),
            eq(users.email, 'session.expired@exemplo'),
            eq(users.email, 'session.revoked@exemplo'),
            eq(users.email, 'session.disabled@exemplo'),
            eq(users.email, 'session.logout@exemplo'),
            eq(users.email, 'session.logout2@exemplo'),
          )
        );
      for (const user of testUsers) {
        await db.delete(userCredentials).where(eq(userCredentials.userId, user.id));
        await db.delete(userTokens).where(eq(userTokens.userId, user.id));
        await db.delete(auditEvents).where(eq(auditEvents.actorUserId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
      }
    });

    it('deve rejeitar sessão inexistente (C-12)', async () => {
      const session = await service.validateSession('sessao-inexistente');
      expect(session).toBeNull();
    });

    it('deve rejeitar sessão revogada (C-13)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'session.revoked@exemplo',
          name: 'Session Revoked User',
          status: 'active',
        })
        .returning();

      const secretHash = await hash('hash-revoked');
      await db.insert(userTokens).values({
        userId: user.id,
        secretHash,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        sessionStart: new Date(),
      });

      const session = await service.validateSession(secretHash);
      expect(session).toBeNull();
    });

    it('deve rejeitar sessão expirada (C-12)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'session.expired@exemplo',
          name: 'Session Expired User',
          status: 'active',
        })
        .returning();

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-expired',
        createdAt: new Date(Date.now() - 7200000),
        lastActivityAt: new Date(Date.now() - 7200000),
        expiresAt: new Date(Date.now() - 3600000),
        revokedAt: null,
        sessionStart: new Date(Date.now() - 7200000),
      });

      const session = await service.validateSession('hash-expired');
      expect(session).toBeNull();
    });

    it('deve rejeitar sessão quando usuário está desabilitado (C-14)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'session.disabled@exemplo',
          name: 'Session Disabled User',
          status: 'inactive',
        })
        .returning();

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-disabled',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        sessionStart: new Date(),
      });

      await expect(service.me('hash-disabled')).rejects.toThrow(AppError);
    });

    it('deve fazer logout e revogar sessão (C-08)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'session.logout@exemplo',
          name: 'Session Logout User',
          status: 'active',
        })
        .returning();

      const senhaCorreta = 'senha_logout_123';
      const senhaHash = await hash(senhaCorreta);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: 'session.logout2@exemplo',
          name: 'Session Logout User 2',
          status: 'active',
        })
        .returning();

      const [credential] = await db
        .insert(userCredentials)
        .values({
          userId: createdUser.id,
          passwordHash: senhaHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .returning();

      const result = await service.login({
        email: 'session.logout2@exemplo',
        password: senhaCorreta,
      });

      expect(result.sessionSecret).toBeDefined();
      expect(result.sessionId).toBeDefined();

      // Faz logout com o segredo da sessão
      await service.logout(result.sessionSecret);

      // Verifica que a sessão foi revogada
      const session = await service.validateSession(result.sessionSecret);
      expect(session).toBeNull();
    });
  },
);
