import { Controller, Get } from '@nestjs/common';
import { AppLogger } from '../../shared/logging/logger.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new AppLogger(HealthController.name);

  @Get()
  check() {
    this.logger.log('Health check solicitado');
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
