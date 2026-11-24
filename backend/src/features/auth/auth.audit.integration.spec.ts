import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  auditEvents,
  users,
  userTokens,
  userCredentials,
} from '../../infrastructure/database/schema.js';
import { and, eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { runWithTraceId } from '../../shared/trace/trace.context.js';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.audit (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(async () => {
      service = new AuthService(new AuditService());
      const db = getDb(dbUrl);
      const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, 'audit.test@exemplo'));
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

    it('deve registrar evento de login bem-sucedido com trace_id (C-16)', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_auditoria_123';
      const senhaHash = await hash(senhaCorreta);

      const [user] = await db
        .insert(users)
        .values({
          email: 'audit.test@exemplo',
          name: 'Audit Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      await runWithTraceId('trace-audit-login-success', () =>
        service.login({
          email: 'audit.test@exemplo',
          password: senhaCorreta,
        }),
      );

      const [evento] = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.login.succeeded'),
            eq(auditEvents.decision, 'permitido'),
            eq(auditEvents.actorUserId, user.id),
          ),
        )
        .orderBy(auditEvents.occurredAt, { descending: true })
        .limit(1);

      expect(evento).toBeDefined();
      expect(evento.traceId).toBeDefined();
      expect(evento.eventType).toBe('auth.login.succeeded');
      expect(evento.decision).toBe('permitido');
      expect(evento.reasonCode).toBe('CREDENTIALS_VALID');
      expect(evento.actorUserId).toBe(user.id);
    });

    it('deve registrar evento de autorização negada com trace_id (C-16)', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_auditoria_123';
      const senhaHash = await hash(senhaCorreta);

      const [user] = await db
        .insert(users)
        .values({
          email: 'audit.test@exemplo',
          name: 'Audit Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      try {
        await runWithTraceId('trace-audit-login-failed', () =>
          service.login({
            email: 'audit.test@exemplo',
            password: 'senha_errada',
          }),
        );
      } catch {}

      const [evento] = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.login.failed'),
            eq(auditEvents.decision, 'negado'),
            eq(auditEvents.actorUserId, user.id),
          ),
        )
        .orderBy(auditEvents.occurredAt, { descending: true })
        .limit(1);

      expect(evento).toBeDefined();
      expect(evento.traceId).toBeDefined();
      expect(evento.eventType).toBe('auth.login.failed');
      expect(evento.decision).toBe('negado');
      expect(evento.reasonCode).toBe('INVALID_CREDENTIALS');
    });

    it('deve persistir evento de logout com trace_id', async () => {
      const db = getDb(dbUrl);
      const senhaCorreta = 'senha_auditoria_logout_123';
      const senhaHash = await hash(senhaCorreta);

      const [user] = await db
        .insert(users)
        .values({
          email: 'audit.test@exemplo',
          name: 'Audit Test User',
          status: 'active',
        })
        .returning();

      await db.insert(userCredentials).values({
        userId: user.id,
        passwordHash: senhaHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const result = await runWithTraceId('trace-audit-logout', () =>
        service.login({
          email: 'audit.test@exemplo',
          password: senhaCorreta,
        }),
      );
      expect(result.sessionSecret).toBeDefined();

      await runWithTraceId('trace-audit-logout', () =>
        service.logout(result.sessionSecret),
      );

      const [evento] = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.logout'),
            eq(auditEvents.decision, 'permitido'),
            eq(auditEvents.actorUserId, user.id),
          ),
        )
        .orderBy(auditEvents.occurredAt, { descending: true })
        .limit(1);

      expect(evento).toBeDefined();
      expect(evento.traceId).toBeDefined();
      expect(evento.eventType).toBe('auth.logout');
      expect(evento.decision).toBe('permitido');
      expect(evento.reasonCode).toBe('USER_LOGOUT');
    });
  },
);
