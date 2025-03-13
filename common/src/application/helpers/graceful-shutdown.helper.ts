import http from 'http';

import { getErrorMessage } from './utility-functions.helper';
import { appConfig } from '../../core/configs/app.config';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';

export abstract class BaseGracefulShutdownHelper {
  protected readonly shutdownTimeout = appConfig.SHUT_DOWN_TIMER;
  protected readonly maxRetries = appConfig.SHUTDOWN_RETRIES;
  protected readonly retryDelay = appConfig.SHUTDOWN_RETRY_DELAY;

  protected abstract disconnectServices (): Promise<void>;

  async shutDown (httpServer: http.Server): Promise<void> {
    let shutdownTimer;

    try {
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => httpServer.close((err) => (err ? reject(err) : resolve())));
      }

      await this.disconnectServices();

      shutdownTimer = this.startShutdownTimer();
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error during shutdown: ${getErrorMessage(error)}`, 'error');
    } finally {
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }

      process.exit(0);
    }
  }

  startShutdownTimer () {
    return setTimeout(() => {
      LoggerTracerInfrastructure.log('Shutdown timeout reached, forcing process exit', 'error');
      process.exit(1);
    }, this.shutdownTimeout);
  }
}
