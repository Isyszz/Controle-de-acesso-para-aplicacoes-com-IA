import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../../features/audit/audit.service.js';

const dbUrl = process.env.DATABASE_URL_TEST;

const mockAuditService = {
  record: async () => {},
} as unknown as AuditService;

describe('AuthService (unitário)', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockAuditService);
  });

  it('deve ser instanciado sem erro', () => {
    expect(service).toBeInstanceOf(AuthService);
  });

  it('AppError deve ter código e statusCode', () => {
    const err = new AppError('TEST_CODE', 'mensagem de teste', 401);
    expect(err.code).toBe('TEST_CODE');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('mensagem de teste');
  });
});

const integrationTests = dbUrl ? describe : describe.skip;

integrationTests(
  'AuthService.login (integração - requer DATABASE_URL_TEST)',
  () => {
    let service: AuthService;

    beforeEach(() => {
      service = new AuthService(mockAuditService);
    });

    it('deve rejeitar login com credenciais inválidas', async () => {
      await expect(
        service.login({ email: 'inexistente@exemplo', password: 'senha123' }),
      ).rejects.toThrow(AppError);
    });
  },
);
