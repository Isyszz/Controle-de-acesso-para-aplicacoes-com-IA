import { Logger } from '@nestjs/common';
import { redactValue } from '../errors/sensitive-fields.js';

/**
 * AppLogger estende o Logger do NestJS com redação automática de campos
 * sensíveis (password, secret, token, key, csrf, authorization, cookie,
 * session) em objetos e arrays estruturados.
 *
 * LIMITAÇÃO: Mensagens textuais simples (strings livres) não são varridas
 * para redação automática, pois isso poderia gerar falsos positivos e
 * prejudicar a legibilidade dos logs. A responsabilidade de não incluir
 * credenciais ou segredos em strings simples cabe ao chamador do logger.
 */
export class AppLogger extends Logger {
  log(message: unknown, context?: string): void {
    super.log(redactValue(message) as string, context ?? this.context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    super.error(redactValue(message) as string, trace, context ?? this.context);
  }

  warn(message: unknown, context?: string): void {
    super.warn(redactValue(message) as string, context ?? this.context);
  }

  debug(message: unknown, context?: string): void {
    super.debug(redactValue(message) as string, context ?? this.context);
  }

  verbose(message: unknown, context?: string): void {
    super.verbose(redactValue(message) as string, context ?? this.context);
  }
}
