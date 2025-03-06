import { Kafka, Consumer } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logger-tracer.infrastructure';
import { GroupIds } from '../../domain/enums/events.enum';

export class KafkaConsumerInfrastructure {
  private consumer: Consumer;

  constructor (private kafka: Kafka, private groupId: string = GroupIds.BASE_GROUP) {
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
  }

  async connect (): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe (topicName: string, handler: (message: string) => void): Promise<void> {
    await this.consumer.subscribe({ topic: topicName, fromBeginning: true });

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
          LoggerTracerInfrastructure.log(`Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
      partitionsConsumedConcurrently: 3,
      eachBatchAutoResolve: false
    });
  }

  async disconnect (): Promise<void> {
    await this.consumer.disconnect();
  }
}
