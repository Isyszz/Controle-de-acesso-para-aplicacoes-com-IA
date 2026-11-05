import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  users,
  userCredentials,
} from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.lockout (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      await db
        .delete(userCredentials)
        .where(eq(userCredentials.userId, users.id));
      await db.delete(users).where(eq(users.email, 'lockout.test@exemplo'));
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
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$test',
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      // 5 falhas consecutivas
      for (let i = 0; i < 5; i++) {
        await expect(
          service.login({
            email: 'lockout.test@exemplo',
            password: 'errada',
          }),
        ).rejects.toThrow(AppError);
      }

      // Verifica que a conta foi bloqueada
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
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$test',
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      await expect(
        service.login({ email: 'lockout.test@exemplo', password: 'qualquer' }),
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

      // Insere com senha conhecida
      const correctHash = await hash('senha_correta_789');
      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: correctHash,
        failedLoginAttempts: 3,
        lockedUntil: null,
      });

      // Faz login com senha correta
      await service.login({
        email: 'lockout.test@exemplo',
        password: 'senha_correta_789',
      });

      // Verifica que a contagem foi resetada
      const [credential] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      expect(credential.failedLoginAttempts).toBe(0);
      expect(credential.lockedUntil).toBeNull();
    });

    it('não deve ultrapassar limite com tentativas simultâneas (C-07)', async () => {
      const db = getDb(dbUrl);
      const [user] = await db
        .insert(users)
        .values({
          email: 'lockout.test@exemplo',
          name: 'Lockout Concurrency Test',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$test',
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      // Executa 10 tentativas simultâneas de login com senha errada
      const promises = Array.from({ length: 10 }, () =>
        service.login({
          email: 'lockout.test@exemplo',
          password: 'senha_errada_concorrente',
        }),
      );

      await Promise.allSettled(promises);

      // Conta quantas falhas foram registradas
      const [credential] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, user.id));

      // Não deve exceder 5 tentativas registradas
      expect(credential.failedLoginAttempts).toBeLessThanOrEqual(5);
      // Se atingiu 5, deve estar bloqueado
      if (credential.failedLoginAttempts >= 5) {
        expect(credential.lockedUntil).not.toBeNull();
      }
    });
  },
);
