import { describe, it, expect } from 'vitest';
import { AppError } from './app-error.js';

describe('AppError', () => {
  it('deve criar um erro com código, statusCode, mensagem e traceId', () => {
    const error = new AppError('AUTHZ_DENIED', 'Acesso negado', 403, 'trace-123');

    expect(error.code).toBe('AUTHZ_DENIED');
    expect(error.statusCode).toBe(403);
    expect(error.traceId).toBe('trace-123');
    expect(error.message).toBe('Acesso negado');
    expect(error).toBeInstanceOf(Error);
  });

  it('deve definir statusCode padrão como 500 e traceId como undefined', () => {
    const error = new AppError('INTERNAL_ERROR', 'Erro interno do servidor');

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.traceId).toBeUndefined();
    expect(error.message).toBe('Erro interno do servidor');
  });

  it('deve permitir omitir traceId', () => {
    const error = new AppError('VALIDATION_ERROR', 'Argumento inválido', 400);

    expect(error.traceId).toBeUndefined();
    expect(error.statusCode).toBe(400);
  });
});
