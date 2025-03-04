import { BaseGracefulShutdownHelper, LoggerTracerInfrastructure, RetryHelper } from '@invoice-hub/common';

import { DbConnectionInfrastructure } from 'infrastructure/db-connection.infrastructure';

export class GracefulShutdownHelper extends BaseGracefulShutdownHelper {
  protected static async disconnectServices (): Promise<void> {
    const disconnectPromises = [
      RetryHelper.executeWithRetry(() => DbConnectionInfrastructure.disconnect(), {
        serviceName: 'Database',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Database disconnect, attempt ${attempt}`);
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
}
