import { Kafka, Producer, Partitioners, Admin } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logger-tracer.infrastructure';

export class KafkaProducerInfrastructure {
  private producer: Producer;
  private admin: Admin;

  constructor (private kafka: Kafka) {
    this.producer = this.kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    this.admin = this.kafka.admin();
  }

  async connect (): Promise<void> {
    await this.producer.connect();
  }

  async publish (topicName: string, message: string): Promise<void> {
    try {
      await this.producer.send({ topic: topicName, messages: [{ value: message }] });
      LoggerTracerInfrastructure.log(`Message sent to topic ${topicName}`);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error creating topic ${topicName}: ${error}`);
    }
  }

  async createTopic (topicName: string): Promise<void> {
    if (!this.kafka) {
      throw new Error('Kafka is not initialized');
    }

    try {
      const existingTopics = await this.admin.listTopics();
      if (!existingTopics.includes(topicName)) {
        await this.admin.createTopics({ topics: [{ topic: topicName, numPartitions: 3, replicationFactor: 2 }], validateOnly: false });
      }
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error creating topic ${topicName}: ${error}`, 'error');
    }
  }

  async disconnect (): Promise<void> {
    await this.producer.disconnect();
  }
}
