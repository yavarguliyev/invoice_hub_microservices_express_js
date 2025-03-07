import { Admin, Kafka } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logger-tracer.infrastructure';
import { KafkaConsumerInfrastructure } from '../kafka/kafka-consumer.infrastructure';
import { KafkaProducerInfrastructure } from '../kafka/kafka-producer.infrastructure';
import { appConfig } from '../../core/configs/app.config';
import { KafkaInitOptions } from '../../domain/interfaces/kafka-init-options.interface';

export class KafkaInfrastructure {
  private static kafka?: Kafka;
  private static producer?: KafkaProducerInfrastructure;
  private static consumer?: KafkaConsumerInfrastructure;
  private static admin?: Admin;

  static async initialize ({ clientId }: KafkaInitOptions): Promise<void> {
    if (this.kafka) {
      return;
    }

    const brokers = [appConfig.KAFKA_BROKER];

    this.kafka = new Kafka({ clientId, brokers, logCreator: LoggerTracerInfrastructure.kafkaLogCreator });
    this.admin = this.kafka.admin();
    this.producer = new KafkaProducerInfrastructure(this.kafka);
    this.consumer = new KafkaConsumerInfrastructure(this.kafka);

    await Promise.all([this.producer.connect(), this.consumer.connect(), this.admin.connect()]);
    LoggerTracerInfrastructure.log('Kafka initialized and connected...');
  }

  static async publish (topicName: string, message: string): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka is not initialized');
    }

    await this.producer.createTopic(topicName);
    await this.producer.publish(topicName, message);
  }

  static async subscribe (topicName: string, handler: (message: string) => void, options?: { groupId?: string }): Promise<void> {
    if (!this.kafka || !this.consumer) {
      throw new Error('Kafka is not initialized');
    }

    if (options?.groupId) {
      const newConsumer = new KafkaConsumerInfrastructure(this.kafka, options.groupId);
      await newConsumer.subscribe(topicName, handler);
    } else {
      await this.consumer.subscribe(topicName, handler);
    }
  }

  static async disconnect (): Promise<void> {
    if (!this.producer || !this.consumer || !this.admin) {
      return;
    }

    await Promise.all([this.producer.disconnect(), this.consumer.disconnect(), this.admin.disconnect()]);
    delete this.kafka;

    LoggerTracerInfrastructure.log('Kafka fully disconnected.');
  }
}
