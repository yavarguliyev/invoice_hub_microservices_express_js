import { Kafka, Consumer } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { getErrorMessage } from '../../application/helpers/utility-functions.helper';
import { KafkaSubscriberOptions, KafkaIsSubscribedToOptions } from '../../domain/interfaces/kafka-request-options.interface';

export class KafkaConsumerInfrastructure {
  private consumer: Consumer;
  private subscribedTopics = new Set<string>();
  private topicHandlers = new Map<string, (message: string) => Promise<unknown>>();
  private isConsumerRunning = false;
  private pendingSubscriptions: Array<string> = [];

  constructor (private kafka: Kafka, private groupId: string) {
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
  }

  async connect (): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe({ topicName, handler }: KafkaSubscriberOptions): Promise<void> {
    if (this.subscribedTopics.has(topicName)) {
      return;
    }

    this.topicHandlers.set(topicName, handler);
    this.subscribedTopics.add(topicName);
    
    if (this.isConsumerRunning) {
      await this.stopConsumer();
    }
    
    this.pendingSubscriptions.push(topicName);
    await this.consumer.subscribe({ topic: topicName, fromBeginning: false });
    
    if (!this.isConsumerRunning) {
      await this.startConsumer();
    }
  }

  async disconnect (): Promise<void> {
    await this.stopConsumer();
    this.subscribedTopics.clear();
    this.topicHandlers.clear();
    this.pendingSubscriptions = [];
    await this.consumer.disconnect();
  }

  isSubscribedTo({ topicName }: KafkaIsSubscribedToOptions): boolean {
    return this.subscribedTopics.has(topicName);
  }

  private async stopConsumer (): Promise<void> {
    if (this.isConsumerRunning) {
      await this.consumer.stop();
      this.isConsumerRunning = false;
    }
  }

  private async startConsumer (): Promise<void> {
    this.isConsumerRunning = true;

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          if (!message.value) {
            return;
          }

          const handler = this.topicHandlers.get(topic);
          if (!handler) {
            return;
          }

          const messageValue = message.value.toString();
          await handler(messageValue);
        } catch (error) {
          LoggerTracerInfrastructure.log(`Error processing message: ${getErrorMessage(error)}`);
        }
      }
    });
  }
}
