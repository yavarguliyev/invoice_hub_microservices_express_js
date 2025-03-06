import {
  BaseGracefulShutdownHelper, KafkaInfrastructure, LoggerTracerInfrastructure, RetryHelper, DbConnectionInfrastructure,
  DBServicesName
} from '@invoice-hub/common';

export class GracefulShutdownHelper extends BaseGracefulShutdownHelper {
  protected static async disconnectServices (): Promise<void> {
    const disconnectPromises = [
      RetryHelper.executeWithRetry(() => DbConnectionInfrastructure.disconnect(DBServicesName.INVOICE_SERVICE), {
        serviceName: 'Database',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Database disconnect, attempt ${attempt}`);
        }
      }),
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
}
