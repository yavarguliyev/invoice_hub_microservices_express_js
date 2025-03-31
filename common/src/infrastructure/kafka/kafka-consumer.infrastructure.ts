import { Kafka, Consumer } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { getErrorMessage } from '../../application/helpers/utility-functions.helper';
import { KafkaSubscriberOptions, KafkaIsSubscribedToOptions } from '../../domain/interfaces/kafka-request-options.interface';

export class KafkaConsumerInfrastructure {
  private consumer: Consumer;
  private subscribedTopics = new Set<string>();
  private topicHandlers = new Map<string, (message: string) => Promise<unknown>>();
  private isConsumerRunning = false;

  constructor (private kafka: Kafka, private groupId: string) {
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
  }
  
  async connect (): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe ({ topicName, handler }: KafkaSubscriberOptions): Promise<void> {
    if (this.subscribedTopics.has(topicName)) {
      this.topicHandlers.set(topicName, handler);
      return;
    }

    this.topicHandlers.set(topicName, handler);
    this.subscribedTopics.add(topicName);

    if (this.isConsumerRunning) {
      await this.stopConsumer();
    }

    await this.consumer.subscribe({ topic: topicName, fromBeginning: false });
    LoggerTracerInfrastructure.log(`Subscribed to topic: ${topicName}`);

    if (!this.isConsumerRunning) {
      await this.startConsumer();
    }
  }

  async batchSubscribe (subscriptions: KafkaSubscriberOptions[]): Promise<void> {
    if (subscriptions.length === 0) {
      return;
    }

    if (this.isConsumerRunning) {
      await this.stopConsumer();
    }

    for (const { topicName, handler } of subscriptions) {
      if (this.subscribedTopics.has(topicName)) {
        this.topicHandlers.set(topicName, handler);
        continue;
      }

      this.topicHandlers.set(topicName, handler);
      this.subscribedTopics.add(topicName);

      await this.consumer.subscribe({ topic: topicName, fromBeginning: false });
      LoggerTracerInfrastructure.log(`Subscribed to topic: ${topicName}`);
    }

    if (!this.isConsumerRunning) {
      await this.startConsumer();
    }
  }

  async disconnect (): Promise<void> {
    await this.stopConsumer();
    this.subscribedTopics.clear();
    this.topicHandlers.clear();
    await this.consumer.disconnect();
  }

  isSubscribedTo ({ topicName }: KafkaIsSubscribedToOptions): boolean {
    return this.subscribedTopics.has(topicName);
  }

  private async stopConsumer (): Promise<void> {
    if (this.isConsumerRunning) {
      try {
        await this.consumer.stop();
        LoggerTracerInfrastructure.log('Stopped');
      } catch (error) {
        LoggerTracerInfrastructure.log(`Error stopping consumer: ${getErrorMessage(error)}`, 'error');
      }

      this.isConsumerRunning = false;
    }
  }

  private async startConsumer(): Promise<void> {
    try {
      LoggerTracerInfrastructure.log('Starting');
      this.isConsumerRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) {
              LoggerTracerInfrastructure.log(`Received empty message on topic: ${topic}`);
              return;
            }

            const handler = this.topicHandlers.get(topic);
            if (!handler) {
              LoggerTracerInfrastructure.log(`No handler found for topic: ${topic}`);
              return;
            }

            const messageValue = message.value.toString();
            LoggerTracerInfrastructure.log(`Received message on topic: ${topic}, partition: ${partition}`);

            await handler(messageValue);
            LoggerTracerInfrastructure.log(`Successfully processed message on topic: ${topic}`);
          } catch (error) {
            LoggerTracerInfrastructure.log(`Error processing message from ${topic}: ${getErrorMessage(error)}`, 'error');
          }
        }
      });

      LoggerTracerInfrastructure.log(`Consumer started for group: ${this.groupId}, subscribed topics: ${Array.from(this.subscribedTopics).join(', ')}`);
    } catch (error) {
      this.isConsumerRunning = false;
      LoggerTracerInfrastructure.log(`Error starting consumer: ${getErrorMessage(error)}`, 'error');
      throw error;
    }
  }

  async subscribeAll (subscriptions: Array<{topicName: string, handler: (message: string) => Promise<void>}>): Promise<void> {
    if (this.isConsumerRunning) {
      await this.stopConsumer();
    }

    for (const { topicName, handler } of subscriptions) {
      this.topicHandlers.set(topicName, handler);
      this.subscribedTopics.add(topicName);
      await this.consumer.subscribe({ topic: topicName, fromBeginning: false });
      LoggerTracerInfrastructure.log(`Subscribed to topic: ${topicName}`);
    }

    if (!this.isConsumerRunning) {
      await this.startConsumer();
    }
  }
}
