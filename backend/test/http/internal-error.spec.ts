import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Request, Response } from 'express';
import request from 'supertest';
import { HttpExceptionFilter } from '../../src/shared/errors/http-exception.filter.js';
import { TraceMiddleware } from '../../src/shared/trace/trace.middleware.js';

@Controller('test-error')
class TestErrorController {
  @Get()
  trigger() {
    throw new Error('Erro inesperado de teste');
  }
}

describe('HttpExceptionFilter - erro inesperado (HTTP 500)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestErrorController],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req, res, next) => {
      new TraceMiddleware().use(req as unknown as Request, res as unknown as Response, next);
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar HTTP 500 com INTERNAL_ERROR, mensagem em PT-BR e traceId para erros inesperados', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-error')
      .expect(500);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toBe('Erro interno do servidor.');
    expect(response.body.error.traceId).toBeDefined();
    expect(typeof response.body.error.traceId).toBe('string');
    expect(response.body.error.traceId.length).toBeGreaterThan(0);
    // Não deve expor stack trace ou detalhes internos
    expect(response.body.error.stack).toBeUndefined();
    expect(response.body.error.details).toBeUndefined();
  });

  it('deve incluir traceId correspondente ao cabeçalho da resposta', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-error')
      .expect(500);

    expect(response.headers['x-trace-id']).toBeDefined();
    expect(response.body.error.traceId).toBe(response.headers['x-trace-id']);
  });
});
