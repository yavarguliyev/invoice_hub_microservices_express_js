import { BaseGracefulShutdownHelper, getErrorMessage, LoggerTracerInfrastructure, RetryHelper } from '@invoice-hub/common';

export class GracefulShutdownHelper extends BaseGracefulShutdownHelper {
  protected async disconnectServices (): Promise<void> {
    const disconnectPromises = [
      RetryHelper.executeWithRetry(async () => Promise.resolve(), {
        serviceName: 'API Gateway',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Redis disconnect, attempt ${attempt}`);
        }
      })
    ];

    try {
      await Promise.all(disconnectPromises);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Service disconnection failed: ${getErrorMessage(error)}`, 'error');
      throw error;
    }
  }
}
