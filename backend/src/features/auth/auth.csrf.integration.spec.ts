import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const CSRF_SECRET = process.env.CSRF_SECRET ?? 'test-secret-key';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';

function computeCsrfToken(sessionId: string): string {
  return createHmac('sha256', CSRF_SECRET).update(sessionId).digest('hex');
}

const mockAuthService = {
  login: async () => ({
    userId: 'user-1',
    email: 'test@exemplo',
    name: 'Test User',
    csrfToken: computeCsrfToken('session-1'),
    sessionSecret: 'session-secret-1',
    sessionId: 'session-1',
  }),
  logout: async () => {},
  refresh: async () => ({
    sessionSecret: 'new-session-secret',
    csrfToken: computeCsrfToken('new-session-1'),
  }),
  me: async () => ({
    id: 'user-1',
    email: 'test@exemplo',
    name: 'Test User',
    status: 'active',
  }),
};

function criarMockRes() {
  const res: any = {
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      res.body = data;
      return res;
    },
    cookie: () => res,
    clearCookie: () => res,
  };
  return res;
}

describe('AuthController CSRF e Origin', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('deve gerar token CSRF válido para um sessionId', () => {
    const sessionId = 'sessao-teste-csrf';
    const token = computeCsrfToken(sessionId);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('deve produzir o mesmo token para o mesmo sessionId', () => {
    const sessionId = 'sessao-teste-csrf-2';
    const token1 = computeCsrfToken(sessionId);
    const token2 = computeCsrfToken(sessionId);
    expect(token1).toBe(token2);
  });

  it('deve produzir tokens diferentes para sessionIds diferentes', () => {
    const token1 = computeCsrfToken('sessao-a');
    const token2 = computeCsrfToken('sessao-b');
    expect(token1).not.toBe(token2);
  });

  it('deve rejeitar logout sem token CSRF', async () => {
    const req = {
      cookies: { session: 'session-1' },
      headers: {},
    } as any;
    const res = criarMockRes();

    await controller.logout(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('AUTHZ_DENIED');
  });

  it('deve rejeitar logout com token CSRF inválido', async () => {
    const req = {
      cookies: { session: 'session-1' },
      headers: { 'x-csrf-token': 'token-invalido' },
    } as any;
    const res = criarMockRes();

    await controller.logout(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('AUTHZ_DENIED');
  });

  it('deve rejeitar refresh com token CSRF inválido', async () => {
    const req = {
      cookies: { session: 'session-1' },
      headers: { 'x-csrf-token': 'token-invalido' },
    } as any;
    const res = criarMockRes();

    await controller.refresh(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('AUTHZ_DENIED');
  });

  it('deve rejeitar logout com Origin não permitido', async () => {
    const req = {
      cookies: { session: 'session-1' },
      headers: {
        'x-csrf-token': computeCsrfToken('session-1'),
        origin: 'http://malicious-site.com',
      },
    } as any;
    const res = criarMockRes();

    await controller.logout(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('AUTHZ_DENIED');
  });
});
