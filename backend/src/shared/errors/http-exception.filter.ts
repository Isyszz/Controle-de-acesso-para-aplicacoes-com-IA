import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { AppError } from './app-error.js';
import { AppLogger } from '../logging/logger.service.js';
import { getTraceId } from '../trace/trace.context.js';

const HTTP_ERROR_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'AUTH_INVALID_CREDENTIALS',
  403: 'AUTHZ_DENIED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_ERROR',
};

const HTTP_USER_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Não autorizado.',
  403: 'Acesso negado.',
  404: 'Recurso não encontrado.',
  409: 'Conflito na requisição.',
  422: 'Entidade não processável.',
  500: 'Erro interno do servidor.',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const traceId = getTraceId() || (request.headers['x-trace-id'] as string) || crypto.randomUUID();

    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno do servidor.';
    let statusCode = 500;

    if (exception instanceof HttpException) {
      const res = exception.getResponse() as {
        message?: string | string[];
        error?: string;
      };
      statusCode = exception.getStatus();
      code = HTTP_ERROR_CODES[statusCode] ?? res.error ?? 'HTTP_ERROR';
      message = HTTP_USER_MESSAGES[statusCode] ?? exception.message;
    } else if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof Error) {
      code = 'INTERNAL_ERROR';
      message = 'Erro interno do servidor.';
    }

    this.logger.error(
      `Request failed: ${code} - ${message} - ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
      HttpExceptionFilter.name,
    );

    response.status(statusCode).json({
      error: {
        code,
        message,
        traceId,
      },
    });
  }
}
