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
  'AuthService.me (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      await db.delete(userTokens).where(eq(userTokens.userId, users.id));
      await db.delete(users).where(eq(users.email, 'me.test@exemplo'));
    });

    it('deve retornar dados do usuário autenticado (C-11)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'me.test@exemplo',
          name: 'Me Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-me-test',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        sessionStart: new Date(),
      });

      const resultado = await service.me('sessao-me-test');

      expect(resultado.id).toBe(user.id);
      expect(resultado.email).toBe('me.test@exemplo');
      expect(resultado.name).toBe('Me Test User');
      expect(resultado.status).toBe('active');
      // Não deve expor senha nem hash
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

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-me-revoked',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(),
        sessionStart: new Date(),
      });

      await expect(service.me('sessao-me-revogada')).rejects.toThrow(AppError);
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

      await db.insert(userTokens).values({
        userId: user.id,
        secretHash: 'hash-me-disabled',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        sessionStart: new Date(),
      });

      await expect(service.me('sessao-me-disabled')).rejects.toThrow(AppError);
    });
  },
);
