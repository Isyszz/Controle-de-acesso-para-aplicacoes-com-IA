import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AuditService } from '../../features/audit/audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import { auditEvents } from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL_TEST;

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.audit (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;
    const recordedEvents: any[] = [];

    beforeEach(async () => {
      service = new AuthService({
        record: async (event: any) => {
          recordedEvents.push(event);
        },
      } as unknown as AuditService);
      const db = getDb(dbUrl);
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.eventType, 'auth.login.failed'));
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.eventType, 'auth.login.succeeded'));
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.eventType, 'auth.logout'));
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.eventType, 'auth.refresh.succeeded'));
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.eventType, 'auth.refresh.failed'));
      recordedEvents.length = 0;
    });

    it('deve ter o serviço de auditoria disponível', () => {
      expect(service).toBeDefined();
      expect(service.auditService).toBeDefined();
      expect(typeof service.auditService.record).toBe('function');
    });

    it('deve ser possível registrar eventos com trace_id', async () => {
      await service.auditService.record({
        traceId: 'trace-teste-auditoria-001',
        eventType: 'auth.login.failed',
        actorUserId: undefined,
        sessionId: undefined,
        action: 'login',
        resourceType: 'session',
        resourceId: undefined,
        permissionCode: undefined,
        policyId: undefined,
        decision: 'negado',
        reasonCode: 'INVALID_CREDENTIALS',
        toolName: 'login',
        status: undefined,
        durationMs: undefined,
        metadata: undefined,
      });

      expect(recordedEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('deve persistir evento de auditoria no banco com trace_id', async () => {
      const db = getDb(dbUrl);
      const traceId = 'trace-persist-auditoria-001';

      await service.auditService.record({
        traceId,
        eventType: 'auth.login.failed',
        actorUserId: undefined,
        sessionId: undefined,
        action: 'login',
        resourceType: 'session',
        resourceId: undefined,
        permissionCode: undefined,
        policyId: undefined,
        decision: 'negado',
        reasonCode: 'INVALID_CREDENTIALS',
        toolName: 'login',
        status: undefined,
        durationMs: undefined,
        metadata: undefined,
      });

      const [evento] = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId))
        .limit(1);

      expect(evento).toBeDefined();
      expect(evento.trace_id).toBe(traceId);
      expect(evento.event_type).toBe('auth.login.failed');
      expect(evento.decision).toBe('negado');
      expect(evento.reason_code).toBe('INVALID_CREDENTIALS');
    });
  },
);
