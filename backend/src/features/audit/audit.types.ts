export type AuditDecision = 'permitido' | 'negado' | 'erro';

export interface AuditEventInput {
  traceId: string;
  eventType: string;
  actorUserId?: string;
  sessionId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  permissionCode?: string;
  policyId?: string;
  decision: AuditDecision;
  reasonCode: string;
  toolName?: string;
  status?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  traceId: string;
  occurredAt: Date;
  eventType: string;
  actorUserId?: string;
  sessionId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  permissionCode?: string;
  policyId?: string;
  decision: AuditDecision;
  reasonCode: string;
  toolName?: string;
  status?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditServicePort {
  record(input: AuditEventInput): Promise<void>;
  findByTraceId(traceId: string): AuditEvent[];
  findAll(): AuditEvent[];
}
