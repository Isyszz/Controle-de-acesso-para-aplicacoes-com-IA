import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  users,
  userCredentials,
  userTokens,
  auditEvents,
} from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { hash } from 'argon2';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.lockout (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, 'lockout.test@exemplo'));
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

    it('deve bloquear conta após 5 falhas consecutivas (C-05)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'lockout.test@exemplo',
          name: 'Lockout Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: await hash('senha_correta_789'),
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      for (let i = 0; i < 5; i++) {
        await expect(
          service.login({
            email: 'lockout.test@exemplo',
            password: 'senha_errada',
          }),
        ).rejects.toThrow(AppError);
      }

      const [credential] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      expect(credential.failedLoginAttempts).toBe(5);
      expect(credential.lockedUntil).not.toBeNull();
    });

    it('deve rejeitar login enquanto conta está bloqueada (C-05)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'lockout.test@exemplo',
          name: 'Lockout Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: await hash('qualquer'),
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      await expect(
        service.login({
          email: 'lockout.test@exemplo',
          password: 'qualquer',
        }),
      ).rejects.toThrow(AppError);
    });

    it('deve resetar contagem após login bem-sucedido (C-06)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'lockout.test@exemplo',
          name: 'Lockout Test User',
          status: 'active',
        })
        .returning();

      const correctHash = await hash('senha_correta_789');
      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: correctHash,
        failedLoginAttempts: 3,
        lockedUntil: null,
      });

      const result = await service.login({
        email: 'lockout.test@exemplo',
        password: 'senha_correta_789',
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe(user.id);

      const [credential] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      expect(credential.failedLoginAttempts).toBe(0);
      expect(credential.lockedUntil).toBeNull();
    });
  },
);
