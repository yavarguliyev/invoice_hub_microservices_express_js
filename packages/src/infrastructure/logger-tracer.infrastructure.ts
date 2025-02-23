import winston from 'winston';

import { LoggerTracerLevels } from '../core/types/logger-tracer.type';

export class LoggerTracerInfrastructure {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
      })
    ]
  });

  static log (message: string, level: LoggerTracerLevels = 'info') {
    const msg = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;

    if (level === 'error') {
      this.logger.error(msg);
    } else {
      this.logger.info(msg);
    }
  }
}
