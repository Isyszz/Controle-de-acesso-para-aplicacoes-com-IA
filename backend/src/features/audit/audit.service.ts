import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppLogger } from '../../shared/logging/logger.service.js';
import {
  AuditEvent,
  AuditEventInput,
  AuditServicePort,
  AuditDecision,
} from './audit.types.js';
import { redactMetadata } from '../../shared/errors/sensitive-fields.js';
import { getDb, resetDb } from '../../infrastructure/database/index.js';
import { auditEvents } from '../../infrastructure/database/schema.js';

const EVENTS_CAP = 10_000;

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value as string);
}


export function toAuditEvent(row: unknown): AuditEvent {
  const r = row as Record<string, unknown>;

  return {
    id: asString(r.id) ?? '',
    traceId: asString(r.traceId) ?? '',
    occurredAt: r.occurredAt
      ? new Date(asString(r.occurredAt) ?? '')
      : new Date(),
    eventType: asString(r.eventType) ?? '',
    actorUserId: asString(r.actorUserId),
    sessionId: asString(r.sessionId),
    action: asString(r.action) ?? '',
    resourceType: asString(r.resourceType),
    resourceId: asString(r.resourceId),
    permissionCode: asString(r.permissionCode),
    policyId: asString(r.policyId),
    decision: (asString(r.decision) ?? 'erro') as AuditDecision,
    reasonCode: asString(r.reasonCode) ?? '',
    toolName: asString(r.toolName),
    status:
      r.status !== undefined && r.status !== null
        ? Number(r.status)
        : undefined,
    durationMs:
      r.durationMs !== undefined && r.durationMs !== null
        ? Number(r.durationMs)
        : undefined,
    metadata: r.metadata
      ? typeof r.metadata === 'string'
        ? JSON.parse(r.metadata)
        : r.metadata
      : undefined,
  };
}
@Injectable()
export class AuditService implements AuditServicePort {
  private readonly logger = new AppLogger(AuditService.name);

  async record(input: AuditEventInput): Promise<void> {
    const db = getDb();

    const event: AuditEvent = {
      id: crypto.randomUUID(),
      traceId: input.traceId,
      occurredAt: new Date(),
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      sessionId: input.sessionId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      permissionCode: input.permissionCode,
      policyId: input.policyId,
      decision: input.decision,
      reasonCode: input.reasonCode,
      toolName: input.toolName,
      status: input.status,
      durationMs: input.durationMs,
      metadata: redactMetadata(input.metadata),
    };

    await db.insert(auditEvents).values({
      id: event.id,
      traceId: event.traceId,
      occurredAt: event.occurredAt,
      eventType: event.eventType,
      actorUserId: event.actorUserId ?? null,
      sessionId: event.sessionId ?? null,
      action: event.action,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      permissionCode: event.permissionCode ?? null,
      policyId: event.policyId ?? null,
      decision: event.decision,
      reasonCode: event.reasonCode,
      toolName: event.toolName ?? null,
      status: event.status ?? null,
      durationMs: event.durationMs ?? null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    });

    const all = await db
      .select()
      .from(auditEvents)
      .orderBy(auditEvents.occurredAt);
    if (all.length >= EVENTS_CAP) {
      const toDelete = all.slice(0, all.length - EVENTS_CAP + 1);
      for (const row of toDelete) {
        await db.delete(auditEvents).where(eq(auditEvents.id, String(row.id)));
      }
    }

    this.logger.log(
      `Audit: ${event.eventType} - ${event.decision} - ${event.reasonCode} - traceId=${event.traceId}`,
    );
  }

  findByTraceId(_traceId: string): AuditEvent[] {
    throw new Error(
      'findByTraceId é assíncrono na versão persistida; use findByTraceIdAsync.',
    );
  }

  findAll(): AuditEvent[] {
    throw new Error(
      'findAll é assíncrono na versão persistida; use findAllAsync.',
    );
  }

  async findByTraceIdAsync(traceId: string): Promise<AuditEvent[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.traceId, traceId));
    return rows.map(toAuditEvent);
  }

  async findAllAsync(): Promise<AuditEvent[]> {
    const db = getDb();
    const rows = await db.select().from(auditEvents);
    return rows.map(toAuditEvent);
  }

  async getDecisionStats(): Promise<Record<AuditDecision, number>> {
    const stats: Record<AuditDecision, number> = {
      permitido: 0,
      negado: 0,
      erro: 0,
    };
    const rows = await this.findAllAsync();
    for (const event of rows) {
      stats[event.decision] = (stats[event.decision] ?? 0) + 1;
    }
    return stats;
  }
}

export { resetDb };
