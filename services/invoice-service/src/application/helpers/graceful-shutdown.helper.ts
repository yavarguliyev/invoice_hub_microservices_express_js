import {
  BaseGracefulShutdownHelper,
  KafkaInfrastructure,
  LoggerTracerInfrastructure,
  RetryHelper,
  DbConnectionInfrastructure,
  RedisInfrastructure,
  getErrorMessage,
  ClientIds,
  GroupIds
} from '@invoice-hub/common';

export class GracefulShutdownHelper extends BaseGracefulShutdownHelper {
  protected static async disconnectServices (): Promise<void> {
    const kafka = new KafkaInfrastructure({ clientId: ClientIds.INVOICE_SERVICE, groupId: GroupIds.INVOICE_SERVICE_GROUP });
    const redis = new RedisInfrastructure();
    const db = new DbConnectionInfrastructure();

    const disconnectPromises = [
      RetryHelper.executeWithRetry(() => redis.disconnect({ clientId: ClientIds.INVOICE_SERVICE }), {
        serviceName: 'Redis',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Redis disconnect, attempt ${attempt}`);
        }
      }),
      RetryHelper.executeWithRetry(() => kafka.disconnect(), {
        serviceName: 'Kafka',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Kafka disconnect, attempt ${attempt}`);
        }
      }),
      RetryHelper.executeWithRetry(() => db.disconnect({ clientId: ClientIds.INVOICE_SERVICE }), {
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
    } catch (error) {
      LoggerTracerInfrastructure.log(`Service disconnection failed: ${getErrorMessage(error)}`, 'error');

      throw error;
    }
  }
}
