import winston from 'winston';
import { logCreator, logLevel, LogEntry } from 'kafkajs';

import { LoggerTracerLevels } from '../../core/types/logger-tracer.type';

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

  static kafkaLogCreator: logCreator = (level) => (entry: LogEntry) => {
    const levelMapping: Record<logLevel, LoggerTracerLevels> = {
      [logLevel.ERROR]: 'error',
      [logLevel.WARN]: 'warn',
      [logLevel.INFO]: 'info',
      [logLevel.DEBUG]: 'debug',
      [logLevel.NOTHING]: 'info'
    };

    const memberAssignment = entry.log?.memberAssignment;
    if (memberAssignment && Object.keys(memberAssignment).length > 0) {
      const groupId = entry.log.groupId;
      const logMessage = entry.log.message;

      LoggerTracerInfrastructure.log(`Message: ${logMessage} ${groupId}`, levelMapping[level]);
    }
  }
}
