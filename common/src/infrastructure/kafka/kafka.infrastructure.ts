import { Admin, Kafka } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { KafkaConsumerInfrastructure } from '../kafka/kafka-consumer.infrastructure';
import { KafkaProducerInfrastructure } from '../kafka/kafka-producer.infrastructure';
import { getErrorMessage } from '../../application/helpers/utility-functions.helper';
import { appConfig } from '../../core/configs/app.config';
import {
  KafkaRequestOptions,
  KafkaResponse,
  KafkaPublisherOptions,
  KafkaSubscriberOptions,
  KafkaHandleResponsedOptions,
  KafkaInitOptions
} from '../../domain/interfaces/kafka-request-options.interface';
import { GroupIds } from '../../domain/enums/events.enum';

export class KafkaInfrastructure {
  private kafka: Kafka;
  private producer: KafkaProducerInfrastructure;
  private consumer: KafkaConsumerInfrastructure;
  private admin: Admin;
  private responseHandlers = new Map<string, (message: string) => void>();
  private consumerInstances = new Map<string, KafkaConsumerInfrastructure>();
  private isInitialized = false;

  constructor ({ clientId, groupId }: KafkaInitOptions) {
    this.kafka = new Kafka({ clientId, brokers: [appConfig.KAFKA_BROKER], logCreator: LoggerTracerInfrastructure.kafkaLogCreator });
    this.producer = new KafkaProducerInfrastructure(this.kafka);
    this.consumer = new KafkaConsumerInfrastructure(this.kafka, groupId);
    this.admin = this.kafka.admin();
  }

  async initialize () {
    if (this.isInitialized) {
      return;
    }

    await Promise.all([this.producer.connect(), this.consumer.connect(), this.admin.connect()]);
    this.isInitialized = true;
    LoggerTracerInfrastructure.log('Kafka initialized and connected...');
  }

  async publish (args: KafkaPublisherOptions) {
    if (!this.isInitialized || !this.producer) {
      throw new Error('Kafka is not initialized');
    }

    await this.producer.createTopic({ topicName: args.topicName });
    await this.producer.publish(args);
  }

  async topicExists (topicName: string): Promise<boolean> {
    try {
      const topics = await this.admin.listTopics();
      return topics.includes(topicName);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error checking if topic ${topicName} exists: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async subscribe (args: KafkaSubscriberOptions) {
    if (!this.isInitialized) {
      throw new Error('Kafka is not initialized');
    }

    try {
      const topicExists = await this.topicExists(args.topicName);
      if (!topicExists) {
        await this.producer.createTopic({ topicName: args.topicName });
      }

      const groupId = args.options?.groupId ?? GroupIds.BASE_GROUP;
      if (!this.consumerInstances.has(groupId)) {
        this.consumerInstances.set(groupId, new KafkaConsumerInfrastructure(this.kafka, groupId));
        await this.consumerInstances.get(groupId)!.connect();
      }

      const consumerInstance = this.consumerInstances.get(groupId)!;
      await consumerInstance.subscribe(args);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error subscribing to topic ${args.topicName}: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async requestResponse<T extends unknown[]> (args: KafkaRequestOptions[]): Promise<T> {
    const promises = args.map(async (arg) => this.processRequest(arg));
    return Promise.all(promises) as Promise<T>;
  }

  async disconnect () {
    if (!this.isInitialized) {
      return;
    }

    this.responseHandlers.clear();
    this.consumerInstances.clear();

    await Promise.all([this.producer?.disconnect(), this.consumer?.disconnect(), this.admin?.disconnect()]);
    this.isInitialized = false;
    LoggerTracerInfrastructure.log('Kafka fully disconnected.');
  }

  private async processRequest (args: KafkaRequestOptions) {
    const { requestTopic, message, responseTopic, groupId, timeoutMs = 10000 } = args;

    return new Promise<string>(async (resolve, reject) => {
      const correlationId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const timeout = setTimeout(() => {
        this.responseHandlers.delete(correlationId);
        reject(new Error('Kafka response timeout'));
      }, timeoutMs);

      this.responseHandlers.set(correlationId, (response: string) => {
        clearTimeout(timeout);
        this.responseHandlers.delete(correlationId);
        resolve(response);
      });

      try {
        await this.publish({ topicName: requestTopic, message: JSON.stringify({ correlationId, message }) });

        if (!this.consumer) {
          return reject(new Error('Kafka consumer is not initialized'));
        }

        if (!this.consumer.isSubscribedTo({ topicName: args.responseTopic })) {
          await this.subscribe({
            topicName: responseTopic, handler: (message: string) => this.handleResponse({ responseMessage: message }), options: { groupId }
          });
        }
      } catch (error) {
        reject(new Error(`Request failed: ${getErrorMessage(error)}`));
      }
    });
  }

  private async handleResponse ({ responseMessage }: KafkaHandleResponsedOptions) {
    const { correlationId, message: response } = JSON.parse(responseMessage) as KafkaResponse;
    const handler = this.responseHandlers.get(correlationId);

    if (handler) {
      handler(response);
    }
  }
}
