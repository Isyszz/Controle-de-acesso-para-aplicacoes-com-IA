import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('HttpExceptionFilter (integração HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar uma resposta de erro padronizada com traceId para exceções HTTP conhecidas', async () => {
    const response = await request(app.getHttpServer())
      .get('/nonexistent-route')
      .expect(404);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBeDefined();
    expect(response.body.error.message).toBeDefined();
    expect(response.body.error.traceId).toBeDefined();
    expect(typeof response.body.error.traceId).toBe('string');
    expect(response.body.error.traceId.length).toBeGreaterThan(0);
  });

  it('deve incluir traceId nas respostas de erro', async () => {
    const response = await request(app.getHttpServer())
      .get('/nonexistent-route')
      .expect(404);

    expect(response.headers['x-trace-id']).toBeDefined();
    expect(response.body.error.traceId).toBe(response.headers['x-trace-id']);
  });

  it('deve retornar códigos de erro estáveis para erros do cliente', async () => {
    const response = await request(app.getHttpServer())
      .get('/nonexistent-route')
      .expect(404);

    expect(response.body.error.code).toMatch(/^[A-Z_]+$/);
    expect(response.body.error.code).not.toBe('INTERNAL_ERROR');
  });

  it('deve retornar status ok para requisições válidas', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});
