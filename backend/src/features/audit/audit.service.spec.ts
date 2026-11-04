import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditService, resetDb, toAuditEvent } from './audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import { auditEvents } from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const TEST_TRACE_ID = 'trace-persist-001';

const baseInput = {
  traceId: TEST_TRACE_ID,
  eventType: 'auth.login.succeeded',
  actorUserId: 'user-1',
  sessionId: 'session-1',
  action: 'login',
  resourceType: 'session',
  decision: 'permitido' as const,
  reasonCode: 'CREDENTIALS_VALID',
};

const dbUrl = process.env.DATABASE_URL_TEST;

describe('AuditService.toAuditEvent (unitário)', () => {
  it('deve mapear linha do banco para AuditEvent', () => {
    const row = {
      id: 'uuid-123',
      trace_id: 'trace-abc',
      occurred_at: new Date('2026-01-01T00:00:00Z'),
      event_type: 'auth.login.succeeded',
      actor_user_id: 'user-1',
      session_id: 'session-1',
      action: 'login',
      resource_type: 'session',
      resource_id: 'sess-1',
      permission_code: null,
      policy_id: null,
      decision: 'permitido',
      reason_code: 'CREDENTIALS_VALID',
      tool_name: null,
      status: 200,
      duration_ms: 42,
      metadata: JSON.stringify({ ip: '192.168.1.1' }),
    };

    const event = toAuditEvent(row);

    expect(event.id).toBe('uuid-123');
    expect(event.traceId).toBe('trace-abc');
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.eventType).toBe('auth.login.succeeded');
    expect(event.actorUserId).toBe('user-1');
    expect(event.sessionId).toBe('session-1');
    expect(event.action).toBe('login');
    expect(event.resourceType).toBe('session');
    expect(event.resourceId).toBe('sess-1');
    expect(event.permissionCode).toBeUndefined();
    expect(event.policyId).toBeUndefined();
    expect(event.decision).toBe('permitido');
    expect(event.reasonCode).toBe('CREDENTIALS_VALID');
    expect(event.toolName).toBeUndefined();
    expect(event.status).toBe(200);
    expect(event.durationMs).toBe(42);
    expect(event.metadata).toEqual({ ip: '192.168.1.1' });
  });

  it('deve tratar valores nulos como undefined', () => {
    const row: Record<string, unknown> = {
      id: 'uuid-1',
      trace_id: 'trace-1',
      occurred_at: new Date(),
      event_type: 'test',
      actor_user_id: null,
      session_id: null,
      action: 'test',
      resource_type: null,
      resource_id: null,
      permission_code: null,
      policy_id: null,
      decision: 'negado',
      reason_code: 'MISSING_PERMISSION',
      tool_name: null,
      status: null,
      duration_ms: null,
      metadata: null,
    };

    const event = toAuditEvent(row);

    expect(event.actorUserId).toBeUndefined();
    expect(event.sessionId).toBeUndefined();
    expect(event.resourceType).toBeUndefined();
    expect(event.resourceId).toBeUndefined();
    expect(event.permissionCode).toBeUndefined();
    expect(event.policyId).toBeUndefined();
    expect(event.toolName).toBeUndefined();
    expect(event.status).toBeUndefined();
    expect(event.durationMs).toBeUndefined();
    expect(event.metadata).toBeUndefined();
  });
});

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests('AuditService (integração - requer DATABASE_URL_TEST)', () => {
  beforeEach(() => {
    resetDb();
  });

  afterEach(async () => {
    try {
      const db = getDb(dbUrl);
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.traceId, TEST_TRACE_ID));
    } catch {
      // Banco pode não estar disponível
    }
    resetDb();
  });

  it('deve registrar um evento e recuperá-lo por traceId', async () => {
    const service = new AuditService();

    await service.record(baseInput);

    const events = await service.findByTraceIdAsync(TEST_TRACE_ID);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('auth.login.succeeded');
    expect(events[0].decision).toBe('permitido');
    expect(events[0].reasonCode).toBe('CREDENTIALS_VALID');
    expect(events[0].traceId).toBe(TEST_TRACE_ID);
    expect(events[0].actorUserId).toBe('user-1');
    expect(events[0].sessionId).toBe('session-1');
    expect(events[0].id).toBeDefined();
    expect(events[0].occurredAt).toBeInstanceOf(Date);
  });

  it('deve registrar um evento de autorização negada', async () => {
    const service = new AuditService();

    await service.record({
      ...baseInput,
      traceId: 'trace-persist-002',
      eventType: 'authorization.denied',
      action: 'get_admin_sales_report',
      permissionCode: 'reports:read:administrative',
      policyId: 'P-03',
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
      toolName: 'get_admin_sales_report',
    });

    const events = await service.findByTraceIdAsync('trace-persist-002');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].decision).toBe('negado');
    expect(events[0].policyId).toBe('P-03');
    expect(events[0].permissionCode).toBe('reports:read:administrative');
  });

  it('deve retornar todos os eventos registrados', async () => {
    const service = new AuditService();

    await service.record({
      ...baseInput,
      traceId: 'trace-persist-a',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...baseInput,
      traceId: 'trace-persist-b',
      eventType: 'authorization.denied',
      action: 'read',
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
    });

    const all = await service.findAllAsync();
    const traceA = all.filter((e) => e.traceId === 'trace-persist-a');
    const traceB = all.filter((e) => e.traceId === 'trace-persist-b');
    expect(traceA.length).toBeGreaterThanOrEqual(1);
    expect(traceB.length).toBeGreaterThanOrEqual(1);
  });

  it('não deve incluir segredos nos metadados', async () => {
    const service = new AuditService();

    await service.record({
      ...baseInput,
      traceId: 'trace-persist-secret',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
      metadata: { password: 'should-not-appear', ip: '192.168.1.1' },
    });

    const events = await service.findByTraceIdAsync('trace-persist-secret');
    const metadata = events[0].metadata as Record<string, unknown>;
    expect(metadata.password).toBe('[REDACTED]');
    expect(metadata.ip).toBe('192.168.1.1');
  });

  it('deve gerar IDs únicos para cada evento', async () => {
    const service = new AuditService();

    await service.record({
      ...baseInput,
      traceId: 'trace-persist-uid-1',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...baseInput,
      traceId: 'trace-persist-uid-2',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });

    const all = await service.findAllAsync();
    const uid1 = all.filter((e) => e.traceId === 'trace-persist-uid-1');
    const uid2 = all.filter((e) => e.traceId === 'trace-persist-uid-2');
    expect(uid1[0].id).not.toBe(uid2[0].id);
  });

  it('deve calcular estatísticas de decisão', async () => {
    const service = new AuditService();

    await service.record({
      ...baseInput,
      traceId: 'trace-persist-stats-1',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...baseInput,
      traceId: 'trace-persist-stats-2',
      eventType: 'authorization.denied',
      action: 'read',
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
    });

    const stats = await service.getDecisionStats();
    expect(stats.permitido).toBeGreaterThanOrEqual(1);
    expect(stats.negado).toBeGreaterThanOrEqual(1);
  });

  it('deve registrar e recuperar um evento de erro da auditoria', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-persist-error-001',
      eventType: 'tool.execution.failed',
      actorUserId: 'user-1',
      sessionId: 'session-1',
      action: 'execute',
      resourceType: 'tool',
      resourceId: 'get_own_sales',
      permissionCode: 'sales:read:own',
      policyId: 'P-01',
      decision: 'erro',
      reasonCode: 'TOOL_EXECUTION_ERROR',
      toolName: 'get_own_sales',
      status: 500,
      durationMs: 120,
    });

    const events = await service.findByTraceIdAsync('trace-persist-error-001');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].decision).toBe('erro');
    expect(events[0].eventType).toBe('tool.execution.failed');
    expect(events[0].reasonCode).toBe('TOOL_EXECUTION_ERROR');
    expect(events[0].toolName).toBe('get_own_sales');
    expect(events[0].status).toBe(500);
    expect(events[0].durationMs).toBe(120);

    const stats = await service.getDecisionStats();
    expect(stats.erro).toBeGreaterThanOrEqual(1);
  });

  it('deve persistir evento no banco e consultar por traceId', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-integration-001',
      eventType: 'test.event',
      action: 'test',
      decision: 'permitido',
      reasonCode: 'TEST_OK',
    });

    const events = await service.findByTraceIdAsync('trace-integration-001');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].traceId).toBe('trace-integration-001');
  });
});
