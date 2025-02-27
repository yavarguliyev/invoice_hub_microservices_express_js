import { Kafka, Consumer } from 'kafkajs';
import { LoggerTracerInfrastructure } from '../logger-tracer.infrastructure';

export class KafkaConsumerInfrastructure {
  private consumer: Consumer;

  constructor (private kafka: Kafka, private groupId: string = 'my-group') {
    this.consumer = this.kafka.consumer({ groupId: this.groupId, sessionTimeout: 60000, heartbeatInterval: 6000, rebalanceTimeout: 3000 });
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
              const messageStr = message.value.toString();

              handler(messageStr);
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
