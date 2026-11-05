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
  'AuthService.refresh (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      await db.delete(userTokens).where(eq(userTokens.userId, users.id));
      await db.delete(users).where(eq(users.email, 'refresh.test@exemplo'));
      await db.delete(users).where(eq(users.email, 'refresh.expired@exemplo'));
      await db.delete(users).where(eq(users.email, 'refresh.limit@exemplo'));
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

      // Sessão com sessionStart de 9 horas atrás
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
  },
);
