import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import {
  AuditService,
  applyEventsCap,
  loadEventsForCap,
  resetDb,
  toAuditEvent,
} from './audit.service.js';
import { getDb } from '../../infrastructure/database/index.js';
import {
  auditEvents,
  roles,
  userRoles,
  users,
} from '../../infrastructure/database/schema.js';
import {
  RoleRepository,
  UserRoleRepository,
} from '../../infrastructure/database/repositories/role.repository.js';

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

const createTxInput = (actorUserId: string, traceId: string) => ({
  ...createBaseInput(actorUserId),
  traceId,
  eventType: 'test.transaction',
  action: 'test',
  reasonCode: 'TEST_TRANSACTION',
});

const createCapRow = (traceId: string, occurredAt: Date, id?: string) => ({
  ...(id ? { id } : {}),
  traceId,
  occurredAt,
  eventType: 'test.cap',
  action: 'test',
  decision: 'permitido' as const,
  reasonCode: 'CAP_TEST',
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

  it('deve registrar evento com executor transacional e reverter no rollback', async () => {
    const service = new AuditService();
    const db = getDb(dbUrl);
    const traceId = `trace-tx-rollback-${randomUUID()}`;

    try {
      await expect(
        db.transaction(async (tx) => {
          await service.record(createTxInput(testUserId, traceId), tx);
          throw new Error('rollback forçado');
        }),
      ).rejects.toThrow('rollback forçado');

      const afterRollback = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId));

      expect(afterRollback).toEqual([]);
    } finally {
      await db.delete(auditEvents).where(eq(auditEvents.traceId, traceId));
    }
  });

  it('deve persistir associação e auditoria na mesma transação', async () => {
    const service = new AuditService();
    const userRoleRepo = new UserRoleRepository();
    const roleRepo = new RoleRepository();
    const db = getDb(dbUrl);
    const traceId = `trace-tx-commit-${randomUUID()}`;
    let roleId: string | undefined;

    try {
      const role = await roleRepo.create({
        code: `audit_tx_commit_${randomUUID()}`,
        name: 'Papel Tx Commit Teste',
      });
      roleId = role.id;

      await db.transaction(async (tx) => {
        await userRoleRepo.assign({ userId: testUserId, roleId: role.id }, tx);
        await service.record(createTxInput(testUserId, traceId), tx);
      });

      const association = await db
        .select()
        .from(userRoles)
        .where(
          and(eq(userRoles.userId, testUserId), eq(userRoles.roleId, role.id)),
        );
      expect(association).toHaveLength(1);

      const events = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId));
      expect(events).toHaveLength(1);
    } finally {
      if (roleId) {
        await db
          .delete(userRoles)
          .where(
            and(eq(userRoles.userId, testUserId), eq(userRoles.roleId, roleId)),
          );
        await db.delete(roles).where(eq(roles.id, roleId));
      }
      await db.delete(auditEvents).where(eq(auditEvents.traceId, traceId));
    }
  });

  it('deve reverter associação e auditoria quando a auditoria falha por FK', async () => {
    const service = new AuditService();
    const userRoleRepo = new UserRoleRepository();
    const roleRepo = new RoleRepository();
    const db = getDb(dbUrl);
    const traceId = `trace-tx-fk-failure-${randomUUID()}`;
    const absentUserId = randomUUID();
    let roleId: string | undefined;

    try {
      const role = await roleRepo.create({
        code: `audit_tx_fk_${randomUUID()}`,
        name: 'Papel Tx FK Teste',
      });
      roleId = role.id;

      await expect(
        db.transaction(async (tx) => {
          await userRoleRepo.assign(
            { userId: testUserId, roleId: role.id },
            tx,
          );
          await service.record(createTxInput(absentUserId, traceId), tx);
        }),
      ).rejects.toThrow();

      const association = await db
        .select()
        .from(userRoles)
        .where(
          and(eq(userRoles.userId, testUserId), eq(userRoles.roleId, role.id)),
        );
      expect(association).toEqual([]);

      const events = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId));
      expect(events).toEqual([]);
    } finally {
      if (roleId) {
        await db
          .delete(userRoles)
          .where(
            and(eq(userRoles.userId, testUserId), eq(userRoles.roleId, roleId)),
          );
        await db.delete(roles).where(eq(roles.id, roleId));
      }
      await db.delete(auditEvents).where(eq(auditEvents.traceId, traceId));
    }
  });

  it('applyEventsCap não deve excluir abaixo do limite', async () => {
    const db = getDb(dbUrl);
    const traceA = `trace-cap-below-${randomUUID()}`;
    const traceIds = [traceA];

    try {
      await db
        .insert(auditEvents)
        .values([createCapRow(traceA, new Date('2026-02-01T00:00:00Z'))]);

      const rows = (await loadEventsForCap(db)).filter((row) =>
        traceIds.includes(row.traceId),
      );
      expect(rows).toHaveLength(1);

      await applyEventsCap(db, rows, 2);

      const remaining = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].traceId).toBe(traceA);
    } finally {
      await db
        .delete(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
    }
  });

  it('applyEventsCap não deve excluir exatamente no limite', async () => {
    const db = getDb(dbUrl);
    const traceA = `trace-cap-equal-a-${randomUUID()}`;
    const traceB = `trace-cap-equal-b-${randomUUID()}`;
    const traceIds = [traceA, traceB];

    try {
      await db
        .insert(auditEvents)
        .values([
          createCapRow(traceA, new Date('2026-02-01T00:00:00Z')),
          createCapRow(traceB, new Date('2026-02-02T00:00:00Z')),
        ]);

      const rows = (await loadEventsForCap(db)).filter((row) =>
        traceIds.includes(row.traceId),
      );
      expect(rows).toHaveLength(2);

      await applyEventsCap(db, rows, 2);

      const remaining = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
      expect(remaining).toHaveLength(2);
      expect(remaining.map((row) => row.traceId).sort()).toEqual(
        traceIds.slice().sort(),
      );
    } finally {
      await db
        .delete(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
    }
  });

  it('applyEventsCap deve excluir somente o excedente acima do limite', async () => {
    const db = getDb(dbUrl);
    const traceA = `trace-cap-over-a-${randomUUID()}`;
    const traceB = `trace-cap-over-b-${randomUUID()}`;
    const traceC = `trace-cap-over-c-${randomUUID()}`;
    const traceIds = [traceA, traceB, traceC];

    try {
      await db
        .insert(auditEvents)
        .values([
          createCapRow(traceA, new Date('2026-02-01T00:00:00Z')),
          createCapRow(traceB, new Date('2026-02-02T00:00:00Z')),
          createCapRow(traceC, new Date('2026-02-03T00:00:00Z')),
        ]);

      const rows = (await loadEventsForCap(db)).filter((row) =>
        traceIds.includes(row.traceId),
      );
      expect(rows.map((row) => row.traceId)).toEqual(traceIds);

      await applyEventsCap(db, rows, 2);

      const remaining = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
      expect(remaining.map((row) => row.traceId).sort()).toEqual(
        [traceB, traceC].sort(),
      );
      expect(remaining.some((row) => row.traceId === traceA)).toBe(false);
    } finally {
      await db
        .delete(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
    }
  });

  it('loadEventsForCap deve desempatar occurredAt igual por id', async () => {
    const db = getDb(dbUrl);
    const [idA, idB] = [randomUUID(), randomUUID()].sort();
    const traceA = `trace-cap-tie-a-${randomUUID()}`;
    const traceB = `trace-cap-tie-b-${randomUUID()}`;
    const traceIds = [traceA, traceB];
    const sameTime = new Date('2026-03-01T00:00:00Z');

    try {
      await db
        .insert(auditEvents)
        .values([
          createCapRow(traceB, sameTime, idB),
          createCapRow(traceA, sameTime, idA),
        ]);

      const rows = (await loadEventsForCap(db)).filter((row) =>
        traceIds.includes(row.traceId),
      );
      expect(rows.map((row) => row.id)).toEqual([idA, idB]);

      await applyEventsCap(db, rows, 1);

      const remaining = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
      expect(remaining.map((row) => row.traceId)).toEqual([traceB]);
    } finally {
      await db
        .delete(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
    }
  });

  it('applyEventsCap deve usar o executor transacional e ser revertido no rollback', async () => {
    const db = getDb(dbUrl);
    const trace1 = `trace-cap-tx-1-${randomUUID()}`;
    const trace2 = `trace-cap-tx-2-${randomUUID()}`;
    const trace3 = `trace-cap-tx-3-${randomUUID()}`;
    const traceIds = [trace1, trace2, trace3];
    const t1 = new Date('2026-04-01T00:00:00Z');
    const t2 = new Date('2026-04-02T00:00:00Z');
    const t3 = new Date('2026-04-03T00:00:00Z');

    try {
      await db
        .insert(auditEvents)
        .values([createCapRow(trace1, t1), createCapRow(trace2, t2)]);

      const initial = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, [trace1, trace2]));
      expect(initial).toHaveLength(2);

      await expect(
        db.transaction(async (tx) => {
          await tx.insert(auditEvents).values(createCapRow(trace3, t3));

          const scopedRows = (await loadEventsForCap(tx)).filter((row) =>
            traceIds.includes(row.traceId),
          );
          expect(scopedRows.map((row) => row.traceId)).toEqual(traceIds);

          await applyEventsCap(tx, scopedRows, 2);

          const insideTx = await tx
            .select()
            .from(auditEvents)
            .where(inArray(auditEvents.traceId, traceIds));
          expect(insideTx.map((row) => row.traceId).sort()).toEqual(
            [trace2, trace3].sort(),
          );

          const beforeRollback = await db
            .select()
            .from(auditEvents)
            .where(inArray(auditEvents.traceId, traceIds));
          expect(beforeRollback.map((row) => row.traceId).sort()).toEqual(
            [trace1, trace2].sort(),
          );

          throw new Error('rollback forçado');
        }),
      ).rejects.toThrow('rollback forçado');

      const afterRollback = await db
        .select()
        .from(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
      expect(afterRollback.map((row) => row.traceId).sort()).toEqual(
        [trace1, trace2].sort(),
      );
    } finally {
      await db
        .delete(auditEvents)
        .where(inArray(auditEvents.traceId, traceIds));
    }
  });

  it('applyEventsCap deve manter 10.000 eventos com o cap padrão de produção', async () => {
    const db = getDb(dbUrl);
    const traceId = `trace-cap-default-${randomUUID()}`;
    const oldestId = randomUUID();
    const newestId = randomUUID();
    const total = 10_001;
    const batchSize = 500;
    const baseTime = new Date('2026-05-01T00:00:00Z').getTime();

    try {
      for (let start = 0; start < total; start += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, total - start) },
          (_, offset) => {
            const index = start + offset;
            const id =
              index === 0
                ? oldestId
                : index === total - 1
                  ? newestId
                  : undefined;

            return createCapRow(traceId, new Date(baseTime + index), id);
          },
        );

        await db.insert(auditEvents).values(batch);
      }

      const inserted = await db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId));
      expect(inserted).toHaveLength(total);

      const rows = (await loadEventsForCap(db)).filter(
        (row) => row.traceId === traceId,
      );
      expect(rows).toHaveLength(total);
      expect(rows[0].id).toBe(oldestId);
      expect(rows[total - 1].id).toBe(newestId);

      await applyEventsCap(db, rows);

      const remaining = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.traceId, traceId));
      expect(remaining).toHaveLength(10_000);
      expect(remaining.some((row) => row.id === oldestId)).toBe(false);
      expect(remaining.some((row) => row.id === newestId)).toBe(true);
    } finally {
      await db.delete(auditEvents).where(eq(auditEvents.traceId, traceId));
    }
  });
});
