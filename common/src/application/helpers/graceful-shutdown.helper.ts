import { config } from 'dotenv';
import http from 'http';

import { LoggerTracerInfrastructure } from '../../infrastructure/logger-tracer.infrastructure';
import { RetryHelper } from './retry.helper';
import { KafkaInfrastructure } from '../../infrastructure/kafka/kafka.infrastructure';

config();

export abstract class BaseGracefulShutdownHelper {
  protected static readonly shutdownTimeout = Number(process.env.SHUT_DOWN_TIMER);
  protected static readonly maxRetries = Number(process.env.SHUTDOWN_RETRIES);
  protected static readonly retryDelay = Number(process.env.SHUTDOWN_RETRY_DELAY);

  static async shutDown (httpServer: http.Server): Promise<void> {
    let shutdownTimer;

    try {
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => httpServer.close((err) => (err ? reject(err) : resolve())));
      }

      await this.disconnectServices();

      shutdownTimer = this.startShutdownTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      LoggerTracerInfrastructure.log(`Error during shutdown: ${errorMessage}`, 'error');
    } finally {
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }

      process.exit(0);
    }
  }

  protected static async disconnectServices (): Promise<void> {
    const disconnectPromises = [
      RetryHelper.executeWithRetry(() => KafkaInfrastructure.disconnect(), {
        serviceName: 'Kafka',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Kafka disconnect, attempt ${attempt}`);
        }
      })
    ];

    try {
      await Promise.all(disconnectPromises);
    } catch (err) {
      LoggerTracerInfrastructure.log(`Service disconnection failed: ${err}`, 'error');
      throw err;
    }
  }

  static startShutdownTimer () {
    return setTimeout(() => {
      LoggerTracerInfrastructure.log('Shutdown timeout reached, forcing process exit', 'error');
      process.exit(1);
    }, this.shutdownTimeout);
  }
}
