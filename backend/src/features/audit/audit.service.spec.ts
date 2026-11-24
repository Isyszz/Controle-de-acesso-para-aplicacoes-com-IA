import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditService, resetDb, toAuditEvent } from './audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import { auditEvents, users } from '../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';

const TEST_TRACE_ID = 'trace-persist-001';

const createBaseInput = (actorUserId: string) => ({
  traceId: TEST_TRACE_ID,
  eventType: 'auth.login.succeeded',
  actorUserId,
  sessionId: 'session-1',
  action: 'login',
  resourceType: 'session',
  decision: 'permitido' as const,
  reasonCode: 'CREDENTIALS_VALID',
});

const dbUrl = process.env.DATABASE_URL_TEST;

describe('AuditService.toAuditEvent (unitário)', () => {
  it('deve mapear linha do banco para AuditEvent', () => {
    const row = {
      id: 'uuid-123',
      traceId: 'trace-abc',
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      eventType: 'auth.login.succeeded',
      actorUserId: 'user-1',
      sessionId: 'session-1',
      action: 'login',
      resourceType: 'session',
      resourceId: 'sess-1',
      permissionCode: null,
      policyId: null,
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
      toolName: null,
      status: 200,
      durationMs: 42,
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
      traceId: 'trace-1',
      occurredAt: new Date(),
      eventType: 'test',
      actorUserId: null,
      sessionId: null,
      action: 'test',
      resourceType: null,
      resourceId: null,
      permissionCode: null,
      policyId: null,
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
      toolName: null,
      status: null,
      durationMs: null,
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
  let testUserId: string;

  beforeEach(async () => {
    resetDb();
    const db = getDb(dbUrl);
    const [user] = await db
      .insert(users)
      .values({
        email: 'audit.integration@exemplo',
        name: 'Audit Integration User',
        status: 'active',
      })
      .returning();
    testUserId = user.id;
  });

  afterEach(async () => {
    try {
      const db = getDb(dbUrl);
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.traceId, TEST_TRACE_ID));
      await db
        .delete(auditEvents)
        .where(eq(auditEvents.actorUserId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch {}
    resetDb();
  });

  it('deve registrar um evento e recuperá-lo por traceId', async () => {
    const service = new AuditService();

    await service.record(createBaseInput(testUserId));

    const events = await service.findByTraceIdAsync(TEST_TRACE_ID);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('auth.login.succeeded');
    expect(events[0].decision).toBe('permitido');
    expect(events[0].reasonCode).toBe('CREDENTIALS_VALID');
    expect(events[0].traceId).toBe(TEST_TRACE_ID);
    expect(events[0].actorUserId).toBe(testUserId);
    expect(events[0].sessionId).toBe('session-1');
    expect(events[0].id).toBeDefined();
    expect(events[0].occurredAt).toBeInstanceOf(Date);
  });

  it('deve registrar um evento de autorização negada', async () => {
    const service = new AuditService();

    await service.record({
      ...createBaseInput(testUserId),
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
      ...createBaseInput(testUserId),
      traceId: 'trace-persist-a',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...createBaseInput(testUserId),
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
      ...createBaseInput(testUserId),
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
      ...createBaseInput(testUserId),
      traceId: 'trace-persist-uid-1',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...createBaseInput(testUserId),
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
      ...createBaseInput(testUserId),
      traceId: 'trace-persist-stats-1',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      ...createBaseInput(testUserId),
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
      ...createBaseInput(testUserId),
      traceId: 'trace-persist-error-001',
      eventType: 'tool.execution.failed',
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
