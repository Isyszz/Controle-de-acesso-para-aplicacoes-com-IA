import { describe, it, expect } from 'vitest';
import {
  asyncLocalStorage,
  getTraceId,
  runWithTraceId,
} from './trace.context.js';

describe('TraceContext', () => {
  it('deve propagar traceId através do armazenamento assíncrono dentro de um contexto de execução', () => {
    let captured: string | undefined;

    runWithTraceId('trace-abc-123', () => {
      captured = getTraceId();
    });

    expect(captured).toBe('trace-abc-123');
  });

  it('deve retornar undefined fora de um contexto de execução', () => {
    expect(getTraceId()).toBeUndefined();
  });

  it('deve isolar traceId entre contextos de execução aninhados', () => {
    let outer: string | undefined;
    let inner: string | undefined;

    runWithTraceId('trace-outer', () => {
      outer = getTraceId();
      runWithTraceId('trace-inner', () => {
        inner = getTraceId();
      });
      outer = getTraceId();
    });

    expect(outer).toBe('trace-outer');
    expect(inner).toBe('trace-inner');
  });

  it('deve retornar undefined após o contexto de execução ser encerrado', () => {
    runWithTraceId('trace-temporary', () => {
      expect(getTraceId()).toBe('trace-temporary');
    });
    expect(getTraceId()).toBeUndefined();
  });

  it('deve preservar traceId durante operações assíncronas com await', async () => {
    let captured: string | undefined;

    await asyncLocalStorage.run({ traceId: 'trace-async' }, async () => {
      await Promise.resolve();
      captured = getTraceId();
    });

    expect(captured).toBe('trace-async');
  });
});
