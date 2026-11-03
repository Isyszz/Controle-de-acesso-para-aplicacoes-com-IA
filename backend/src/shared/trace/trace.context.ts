import { AsyncLocalStorage } from 'node:async_hooks';

export interface TraceContext {
  traceId: string;
}

export const asyncLocalStorage = new AsyncLocalStorage<TraceContext>();

export function getTraceId(): string | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.traceId;
}

export function runWithTraceId<T>(traceId: string, fn: () => T): T {
  return asyncLocalStorage.run({ traceId }, fn);
}
