import { Kafka } from 'kafkajs';
import { LoggerTracerInfrastructure } from '../logger-tracer.infrastructure';
import { KafkaProducerInfrastructure } from './kafka-producer.infrastructure';
import { KafkaConsumerInfrastructure } from './kafka-consumer.infrastructure';

export class KafkaInfrastructure {
  private static kafka?: Kafka;
  private static producer?: KafkaProducerInfrastructure;
  private static consumer?: KafkaConsumerInfrastructure;

  static async initialize (): Promise<void> {
    if (this.kafka) {
      return;
    }

    const brokers = [process.env.KAFKA_BROKER!];
    this.kafka = new Kafka({ clientId: 'my-app', brokers, requestTimeout: 30000 });

    this.producer = new KafkaProducerInfrastructure(this.kafka);
    this.consumer = new KafkaConsumerInfrastructure(this.kafka);

    await Promise.all([this.producer.connect(), this.consumer.connect()]);
    LoggerTracerInfrastructure.log('Kafka initialized and connected...');
  }

  static async createTopic (topicName: string): Promise<void> {
    if (!this.kafka) {
      throw new Error('Kafka is not initialized');
    }

    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const existingTopics = await admin.listTopics();
      if (!existingTopics.includes(topicName)) {
        await admin.createTopics({ topics: [{ topic: topicName, numPartitions: 3, replicationFactor: 2 }], validateOnly: false });
      }
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error creating topic ${topicName}: ${error}`, 'error');
    } finally {
      await admin.disconnect();
    }
  }

  static async publish (topicName: string, message: string): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka is not initialized');
    }

    await this.createTopic(topicName);
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
    if (!this.producer || !this.consumer) {
      return;
    }

    await Promise.all([this.producer.disconnect(), this.consumer.disconnect()]);
    delete this.kafka;

    LoggerTracerInfrastructure.log('Kafka fully disconnected.');
  }
}
