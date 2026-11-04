import { Logger } from '@nestjs/common';
import { redactValue } from '../errors/sensitive-fields.js';

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
