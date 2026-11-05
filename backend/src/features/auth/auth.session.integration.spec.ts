import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import { users, userTokens } from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.session (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      await db.delete(userTokens).where(eq(userTokens.userId, users.id));
      await db.delete(users).where(eq(users.email, 'session.test@exemplo'));
      await db.delete(users).where(eq(users.email, 'session.expired@exemplo'));
      await db.delete(users).where(eq(users.email, 'session.revoked@exemplo'));
      await db.delete(users).where(eq(users.email, 'session.disabled@exemplo'));
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

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-revoked',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        sessionStart: new Date(),
      });

      const session = await service.validateSession('sessao-revogada');
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

      const session = await service.validateSession('sessao-expirada');
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

      await expect(service.me('sessao-usuario-desabilitado')).rejects.toThrow(
        AppError,
      );
    });
  },
);
