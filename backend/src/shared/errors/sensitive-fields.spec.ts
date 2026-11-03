import { describe, it, expect } from 'vitest';
import {
  SENSITIVE_FIELDS,
  isSensitiveKey,
  redactValue,
  redactMetadata,
  isTraceIdValid,
  sanitizeTraceId,
} from './sensitive-fields.js';

describe('sensitive-fields', () => {
  it('deve listar os campos sensíveis esperados', () => {
    expect(SENSITIVE_FIELDS).toContain('password');
    expect(SENSITIVE_FIELDS).toContain('secret');
    expect(SENSITIVE_FIELDS).toContain('token');
    expect(SENSITIVE_FIELDS).toContain('key');
    expect(SENSITIVE_FIELDS).toContain('csrf');
    expect(SENSITIVE_FIELDS).toContain('authorization');
    expect(SENSITIVE_FIELDS).toContain('cookie');
    expect(SENSITIVE_FIELDS).toContain('session');
  });

  it('deve identificar chaves sensíveis de forma insensível a maiúsculas', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('PASSWORD')).toBe(true);
    expect(isSensitiveKey('Secret')).toBe(true);
    expect(isSensitiveKey('session_token')).toBe(true);
    expect(isSensitiveKey('user_name')).toBe(false);
    expect(isSensitiveKey('action')).toBe(false);
  });

  it('deve redigir campos sensíveis em objetos planos', () => {
    const result = redactValue({
      password: 'secret123',
      user: 'john',
      token: 'abc-token',
    });

    expect(result).toEqual({
      password: '[REDACTED]',
      user: 'john',
      token: '[REDACTED]',
    });
  });

  it('deve redigir campos sensíveis em objetos aninhados', () => {
    const result = redactValue({
      user: 'john',
      credentials: { password: 'hidden', type: 'argon2id' },
    });

    expect(result).toEqual({
      user: 'john',
      credentials: { password: '[REDACTED]', type: 'argon2id' },
    });
  });

  it('deve redigir campos sensíveis em arrays', () => {
    const result = redactValue([
      { password: 'p1', name: 'a' },
      { token: 't1', name: 'b' },
    ]);

    expect(result).toEqual([
      { password: '[REDACTED]', name: 'a' },
      { token: '[REDACTED]', name: 'b' },
    ]);
  });

  it('não deve modificar strings', () => {
    expect(redactValue('plain string')).toBe('plain string');
  });

  it('redactMetadata deve retornar undefined para entrada undefined', () => {
    expect(redactMetadata(undefined)).toBeUndefined();
  });

  it('redactMetadata deve redigir campos sensíveis', () => {
    const result = redactMetadata({
      password: 'should-not-appear',
      ip: '192.168.1.1',
    });

    expect(result?.password).toBe('[REDACTED]');
    expect(result?.ip).toBe('192.168.1.1');
  });

  it('isTraceIdValid deve rejeitar undefined, vazio, longo e ids inválidos', () => {
    expect(isTraceIdValid(undefined)).toBe(false);
    expect(isTraceIdValid('')).toBe(false);
    expect(isTraceIdValid('a'.repeat(200))).toBe(false);
    expect(isTraceIdValid('invalid trace!!')).toBe(false);
  });

  it('isTraceIdValid deve aceitar ids válidos', () => {
    expect(isTraceIdValid('trace-123')).toBe(true);
    expect(isTraceIdValid('abc_def-123')).toBe(true);
  });

  it('sanitizeTraceId deve retornar ids válidos inalterados', () => {
    expect(sanitizeTraceId('valid-trace-id')).toBe('valid-trace-id');
  });

  it('sanitizeTraceId deve gerar um novo UUID para ids inválidos', () => {
    const result = sanitizeTraceId('invalid trace!!');
    expect(result).not.toBe('invalid trace!!');
    expect(/^[a-zA-Z0-9_-]+$/.test(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(128);
  });

  it('sanitizeTraceId deve gerar um novo UUID para undefined', () => {
    const result = sanitizeTraceId(undefined);
    expect(/^[a-zA-Z0-9_-]+$/.test(result)).toBe(true);
  });
});
