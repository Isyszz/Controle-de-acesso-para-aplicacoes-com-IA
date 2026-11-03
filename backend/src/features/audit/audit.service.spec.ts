import { describe, it, expect } from 'vitest';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  it('deve registrar um evento e recuperá-lo por traceId', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-001',
      eventType: 'auth.login.succeeded',
      actorUserId: 'user-1',
      sessionId: 'session-1',
      action: 'login',
      resourceType: 'session',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });

    const events = service.findByTraceId('trace-001');
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('auth.login.succeeded');
    expect(events[0].decision).toBe('permitido');
    expect(events[0].reasonCode).toBe('CREDENTIALS_VALID');
    expect(events[0].traceId).toBe('trace-001');
    expect(events[0].actorUserId).toBe('user-1');
    expect(events[0].sessionId).toBe('session-1');
    expect(events[0].id).toBeDefined();
    expect(events[0].occurredAt).toBeInstanceOf(Date);
  });

  it('deve registrar um evento de autorização negada', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-002',
      eventType: 'authorization.denied',
      actorUserId: 'user-1',
      action: 'get_admin_sales_report',
      permissionCode: 'reports:read:administrative',
      policyId: 'P-03',
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
      toolName: 'get_admin_sales_report',
    });

    const events = service.findByTraceId('trace-002');
    expect(events.length).toBe(1);
    expect(events[0].decision).toBe('negado');
    expect(events[0].policyId).toBe('P-03');
    expect(events[0].permissionCode).toBe('reports:read:administrative');
  });

  it('deve registrar um evento de erro', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-003',
      eventType: 'tool.execution.failed',
      action: 'execute',
      toolName: 'get_own_sales',
      decision: 'erro',
      reasonCode: 'TOOL_EXECUTION_ERROR',
      status: 500,
      durationMs: 120,
    });

    const events = service.findByTraceId('trace-003');
    expect(events.length).toBe(1);
    expect(events[0].decision).toBe('erro');
    expect(events[0].status).toBe(500);
    expect(events[0].durationMs).toBe(120);
  });

  it('deve retornar array vazio para traceId desconhecido', () => {
    const service = new AuditService();
    const events = service.findByTraceId('nonexistent');
    expect(events).toEqual([]);
  });

  it('deve retornar todos os eventos registrados', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-a',
      eventType: 'auth.login.succeeded',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      traceId: 'trace-b',
      eventType: 'authorization.denied',
      action: 'read',
      decision: 'negado',
      reasonCode: 'MISSING_PERMISSION',
    });

    const all = service.findAll();
    expect(all.length).toBe(2);
  });

  it('não deve incluir segredos nos metadados', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-secret',
      eventType: 'auth.login.succeeded',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
      metadata: { password: 'should-not-appear', ip: '192.168.1.1' },
    });

    const events = service.findByTraceId('trace-secret');
    const metadata = events[0].metadata as Record<string, unknown>;
    expect(metadata.password).toBe('[REDACTED]');
    expect(metadata.ip).toBe('192.168.1.1');
  });

  it('deve gerar IDs únicos para cada evento', async () => {
    const service = new AuditService();

    await service.record({
      traceId: 'trace-uid-1',
      eventType: 'auth.login.succeeded',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });
    await service.record({
      traceId: 'trace-uid-2',
      eventType: 'auth.login.succeeded',
      action: 'login',
      decision: 'permitido',
      reasonCode: 'CREDENTIALS_VALID',
    });

    const all = service.findAll();
    expect(all[0].id).not.toBe(all[1].id);
  });
});
