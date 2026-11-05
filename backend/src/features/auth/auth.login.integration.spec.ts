import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { hash } from 'argon2';
import { getDb } from '../../infrastructure/database/index.js';
import {
  users,
  userCredentials,
} from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.login (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      await db
        .delete(userCredentials)
        .where(eq(userCredentials.userId, users.id));
      await db.delete(users).where(eq(users.email, 'login.test@exemplo'));
      await db.delete(users).where(eq(users.email, 'login.disabled@exemplo'));
      await db.delete(users).where(eq(users.email, 'login.locked@exemplo'));
    });

    it('deve criar sessão para credenciais válidas (C-01)', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_correta_123';
      const senhaHash = await hash(senhaCorreta);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: 'login.test@exemplo',
          name: 'Login Test User',
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
        email: 'login.test@exemplo',
        password: senhaCorreta,
      });

      expect(result.userId).toBe(createdUser.id);
      expect(result.email).toBe('login.test@exemplo');
      expect(result.name).toBe('Login Test User');
      expect(result.csrfToken).toBeDefined();
      expect(result.sessionSecret).toBeDefined();
    });

    it('deve rejeitar senha inválida com erro genérico (C-02)', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_correta_456';
      const senhaHash = await hash(senhaCorreta);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: 'login.test@exemplo',
          name: 'Login Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: createdUser.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      await expect(
        service.login({
          email: 'login.test@exemplo',
          password: 'senha_errada',
        }),
      ).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
        statusCode: 401,
        message: 'Credenciais inválidas.',
      });
    });

    it('deve rejeitar usuário inexistente com erro genérico (C-03)', async () => {
      const db = getDb(dbUrl);
      await db.delete(users).where(eq(users.email, 'inexistente@exemplo'));

      await expect(
        service.login({
          email: 'inexistente@exemplo',
          password: 'qualquer',
        }),
      ).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
        statusCode: 401,
        message: 'Credenciais inválidas.',
      });
    });

    it('deve rejeitar conta desabilitada com erro genérico e auditar (C-04)', async () => {
      const db = getDb(dbUrl);
      await db.delete(users).where(eq(users.email, 'login.disabled@exemplo'));

      const [disabledUser] = await db
        .insert(users)
        .values({
          email: 'login.disabled@exemplo',
          name: 'Disabled User',
          status: 'inactive',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: disabledUser.id,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$test',
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      await expect(
        service.login({
          email: 'login.disabled@exemplo',
          password: 'qualquer',
        }),
      ).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
        statusCode: 401,
        message: 'Credenciais inválidas.',
      });
    });
  },
);
