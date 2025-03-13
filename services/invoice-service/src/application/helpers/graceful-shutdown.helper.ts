import { Container } from 'typedi';
import {
  BaseGracefulShutdownHelper,
  KafkaInfrastructure,
  LoggerTracerInfrastructure,
  RetryHelper,
  DbConnectionInfrastructure,
  RedisInfrastructure,
  getErrorMessage,
  ClientIds
} from '@invoice-hub/common';

export class GracefulShutdownHelper extends BaseGracefulShutdownHelper {
  private kafka: KafkaInfrastructure;
  private redis: RedisInfrastructure;
  private db: DbConnectionInfrastructure;

  constructor () {
    super();

    this.kafka = Container.get(KafkaInfrastructure);
    this.redis = Container.get(RedisInfrastructure);
    this.db = Container.get(DbConnectionInfrastructure);
  }

  protected async disconnectServices (): Promise<void> {
    const disconnectPromises = [
      RetryHelper.executeWithRetry(() => this.redis.disconnect({ clientId: ClientIds.INVOICE_SERVICE }), {
        serviceName: 'Redis',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Redis disconnect, attempt ${attempt}`);
        }
      }),
      RetryHelper.executeWithRetry(() => this.kafka.disconnect(), {
        serviceName: 'Kafka',
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        onRetry: (attempt) => {
          LoggerTracerInfrastructure.log(`Retrying Kafka disconnect, attempt ${attempt}`);
        }
      }),
      RetryHelper.executeWithRetry(() => this.db.disconnect({ clientId: ClientIds.INVOICE_SERVICE }), {
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
