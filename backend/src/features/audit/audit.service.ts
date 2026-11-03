import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../shared/logging/logger.service.js';
import {
  AuditEvent,
  AuditEventInput,
  AuditServicePort,
  AuditDecision,
} from './audit.types.js';
import { redactMetadata } from '../../shared/errors/sensitive-fields.js';


const EVENTS_CAP = 10_000;

@Injectable()
export class AuditService implements AuditServicePort {
  private readonly logger = new AppLogger(AuditService.name);
  private readonly events: AuditEvent[] = [];

  async record(input: AuditEventInput): Promise<void> {
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

    if (this.events.length >= EVENTS_CAP) {
      this.events.shift();
    }
    this.events.push(event);

    this.logger.log(
      `Audit: ${event.eventType} - ${event.decision} - ${event.reasonCode} - traceId=${event.traceId}`,
    );
  }

  findByTraceId(traceId: string): AuditEvent[] {
    return this.events.filter((e) => e.traceId === traceId);
  }

  findAll(): AuditEvent[] {
    return [...this.events];
  }

  getDecisionStats(): Record<AuditDecision, number> {
    const stats: Record<AuditDecision, number> = {
      permitido: 0,
      negado: 0,
      erro: 0,
    };
    for (const event of this.events) {
      stats[event.decision] = (stats[event.decision] ?? 0) + 1;
    }
    return stats;
  }
}
