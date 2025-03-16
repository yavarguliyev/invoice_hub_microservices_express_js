import http from 'http';

import { RetryHelper } from './retry.helper';
import { getErrorMessage } from './utility-functions.helper';
import { appConfig } from '../../core/configs/app.config';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';
import { GracefulShutDownServiceConfig } from '../../domain/interfaces/dependency-config.interface';

export class GracefulShutdownHelper {
  private readonly shutdownTimeout = appConfig.SHUT_DOWN_TIMER;
  private readonly maxRetries = appConfig.SHUTDOWN_RETRIES;
  private readonly retryDelay = appConfig.SHUTDOWN_RETRY_DELAY;
  private readonly services: GracefulShutDownServiceConfig[];

  constructor (services: GracefulShutDownServiceConfig[]) {
    this.services = services;
  }

  public async shutDown (httpServer: http.Server): Promise<void> {
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

  private async disconnectServices (): Promise<void> {
    const disconnectPromises = this.services.map((service) =>
      this.retryDisconnect(service).catch((error) => {
        LoggerTracerInfrastructure.log(`${service.name} disconnection failed: ${getErrorMessage(error)}`, 'error');
        throw error;
      })
    );

    try {
      await Promise.all(disconnectPromises);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Service disconnection failed: ${getErrorMessage(error)}`, 'error');
      throw error;
    }
  }

  private async retryDisconnect (service: GracefulShutDownServiceConfig): Promise<void> {
    await RetryHelper.executeWithRetry(
      service.disconnect,
      {
        serviceName: service.name,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying ${service.name} disconnect, attempt ${attempt}`);
        }
      }
    );
  }

  private startShutdownTimer() {
    return setTimeout(() => {
      LoggerTracerInfrastructure.log('Shutdown timeout reached, forcing process exit', 'error');
      process.exit(1);
    }, this.shutdownTimeout);
  }
}
