import { describe, it, expect, vi, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { AppLogger } from './logger.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppLogger', () => {
  it('deve redigir campos sensíveis em objetos registrados', () => {
    const logger = new AppLogger('TestLogger');
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

    logger.log({ password: 'secret123', token: 'abc-token', user: 'john', csrf: 'xyz' });

    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: '[REDACTED]',
        token: '[REDACTED]',
        user: 'john',
        csrf: '[REDACTED]',
      }),
      'TestLogger',
    );
  });

  it('deve redigir campos sensíveis aninhados', () => {
    const logger = new AppLogger('TestLogger');
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

    logger.log({
      user: 'john',
      credentials: { password: 'hidden', type: 'argon2id' },
    });

    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'john',
        credentials: expect.objectContaining({
          password: '[REDACTED]',
          type: 'argon2id',
        }),
      }),
      'TestLogger',
    );
  });

  it('não deve modificar campos não sensíveis', () => {
    const logger = new AppLogger('TestLogger');
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

    logger.log({ action: 'login', traceId: 'trace-123', status: 200 });

    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login',
        traceId: 'trace-123',
        status: 200,
      }),
      'TestLogger',
    );
  });

  it('deve redigir campos sensíveis no registro de erros', () => {
    const logger = new AppLogger('TestLogger');
    const loggerErrorSpy = vi.spyOn(Logger.prototype, 'error');

    logger.error({ session_secret: 'should-be-redacted', message: 'failed' });

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        session_secret: '[REDACTED]',
        message: 'failed',
      }),
      undefined,
      'TestLogger',
    );
  });

  it('deve lidar com mensagens de texto simples sem problemas de redação', () => {
    const logger = new AppLogger('TestLogger');
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

    logger.log('Simple string message');

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith('Simple string message', 'TestLogger');
  });

  it('deve registrar aviso apenas uma vez com campos sensíveis redigidos', () => {
    const logger = new AppLogger('TestLogger');
    const loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn');

    logger.warn({ password: 'secret123', user: 'john' });

    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: '[REDACTED]',
        user: 'john',
      }),
      'TestLogger',
    );
  });

  it('deve registrar depuração apenas uma vez com campos sensíveis redigidos', () => {
    const logger = new AppLogger('TestLogger');
    const loggerDebugSpy = vi.spyOn(Logger.prototype, 'debug');

    logger.debug({ token: 'abc-token', action: 'login' });

    expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
    expect(loggerDebugSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        token: '[REDACTED]',
        action: 'login',
      }),
      'TestLogger',
    );
  });

  it('deve registrar log detalhado apenas uma vez com campos sensíveis redigidos', () => {
    const logger = new AppLogger('TestLogger');
    const loggerVerboseSpy = vi.spyOn(Logger.prototype, 'verbose');

    logger.verbose({ session: 'xyz-session', user: 'john' });

    expect(loggerVerboseSpy).toHaveBeenCalledTimes(1);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        session: '[REDACTED]',
        user: 'john',
      }),
      'TestLogger',
    );
  });

  it('deve registrar erro apenas uma vez com campos sensíveis redigidos', () => {
    const logger = new AppLogger('TestLogger');
    const loggerErrorSpy = vi.spyOn(Logger.prototype, 'error');

    logger.error({ password: 'secret123', message: 'failed' });

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: '[REDACTED]',
        message: 'failed',
      }),
      undefined,
      'TestLogger',
    );
  });

  it('deve registrar log apenas uma vez com campos sensíveis redigidos', () => {
    const logger = new AppLogger('TestLogger');
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

    logger.log({ password: 'secret123', user: 'john' });

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: '[REDACTED]',
        user: 'john',
      }),
      'TestLogger',
    );
  });
});
