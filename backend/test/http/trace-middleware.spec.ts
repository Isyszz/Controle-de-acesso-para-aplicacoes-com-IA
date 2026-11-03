import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('TraceMiddleware (integração HTTP)', () => {
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

  it('deve gerar um trace_id para cada requisição e retorná-lo no cabeçalho da resposta', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-trace-id']).toBeDefined();
    expect(typeof response.headers['x-trace-id']).toBe('string');
    expect(response.headers['x-trace-id']!.length).toBeGreaterThan(0);
  });

  it('deve usar o x-trace-id fornecido no cabeçalho da requisição quando válido', async () => {
    const customTraceId = 'my-custom-trace-id-123';
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-trace-id', customTraceId)
      .expect(200);

    expect(response.headers['x-trace-id']).toBe(customTraceId);
  });

  it('deve gerar um novo trace_id quando o x-trace-id fornecido é inválido', async () => {
    const invalidTraceId = 'invalid trace id with spaces!!';
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-trace-id', invalidTraceId)
      .expect(200);

    expect(response.headers['x-trace-id']).toBeDefined();
    expect(response.headers['x-trace-id']).not.toBe(invalidTraceId);
    expect(/^[a-zA-Z0-9_-]+$/.test(response.headers['x-trace-id']!)).toBe(true);
  });

  it('deve gerar um novo trace_id quando o x-trace-id fornecido é muito longo', async () => {
    const longTraceId = 'a'.repeat(200);
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-trace-id', longTraceId)
      .expect(200);

    expect(response.headers['x-trace-id']).toBeDefined();
    expect(response.headers['x-trace-id']!.length).toBeLessThanOrEqual(128);
    expect(response.headers['x-trace-id']).not.toBe(longTraceId);
  });

  it('deve isolar o contexto do trace_id entre requisições concorrentes', async () => {
    const traceIds: string[] = [];

    await Promise.all([
      request(app.getHttpServer()).get('/health').then((res) => {
        traceIds.push(res.headers['x-trace-id']);
      }),
      request(app.getHttpServer()).get('/health').then((res) => {
        traceIds.push(res.headers['x-trace-id']);
      }),
    ]);

    expect(traceIds[0]).toBeDefined();
    expect(traceIds[1]).toBeDefined();
    expect(traceIds[0]).not.toBe(traceIds[1]);
  });
});
