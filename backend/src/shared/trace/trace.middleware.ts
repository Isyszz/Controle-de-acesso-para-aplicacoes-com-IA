import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { runWithTraceId } from './trace.context.js';
import { sanitizeTraceId } from '../errors/sensitive-fields.js';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void): void {
    const rawTraceId = req.headers['x-trace-id'] as string | undefined;
    const traceId = sanitizeTraceId(rawTraceId);
    res.setHeader('x-trace-id', traceId);
    runWithTraceId(traceId, next);
  }
}
