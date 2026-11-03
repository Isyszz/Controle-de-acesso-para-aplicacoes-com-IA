export const SENSITIVE_FIELDS: string[] = [
  'password',
  'secret',
  'token',
  'key',
  'csrf',
  'authorization',
  'cookie',
  'session',
];

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_FIELDS.some((f) => lower.includes(f));
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactValue(val);
      }
    }
    return redacted;
  }
  return value;
}

export function redactMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }
  return redactValue(metadata) as Record<string, unknown>;
}

export function isTraceIdValid(traceId: string | undefined): boolean {
  if (!traceId) {
    return false;
  }
  if (traceId.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(traceId);
}

export function sanitizeTraceId(traceId: string | undefined): string {
  if (!isTraceIdValid(traceId)) {
    return crypto.randomUUID();
  }
  return traceId as string;
}
