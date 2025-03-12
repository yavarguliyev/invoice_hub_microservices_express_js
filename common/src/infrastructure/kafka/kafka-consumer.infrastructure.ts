import { Kafka, Consumer } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { getErrorMessage } from '../../application/helpers/utility-functions.helper';
import { KafkaSubscriberOptions, KafkaIsSubscribedToOptions } from '../../domain/interfaces/kafka-request-options.interface';

export class KafkaConsumerInfrastructure {
  private consumer: Consumer;
  private subscribedTopics = new Set<string>();

  constructor (private kafka: Kafka, private groupId: string) {
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
  }

  async connect (): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe ({ topicName, handler }: KafkaSubscriberOptions): Promise<void> {
    if (this.subscribedTopics.has(topicName)) {
      return;
    }

    this.subscribedTopics.add(topicName);

    await this.consumer.subscribe({ topic: topicName, fromBeginning: false });
    await this.consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        try {
          for (const message of batch.messages) {
            if (message.value) {
              handler(message.value.toString());
              resolveOffset(message.offset);
            }
          }

          await heartbeat();
        } catch (error) {
          LoggerTracerInfrastructure.log(`Error processing batch: ${getErrorMessage(error)}`);
        }
      },
      partitionsConsumedConcurrently: 3,
      eachBatchAutoResolve: false
    });
  }

  async disconnect (): Promise<void> {
    this.subscribedTopics.clear();
    await this.consumer.disconnect();
  }

  isSubscribedTo ({ topicName }: KafkaIsSubscribedToOptions): boolean {
    return this.subscribedTopics.has(topicName);
  }
}
