import { Kafka, Producer, Partitioners, Admin } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { getErrorMessage } from '../../application/helpers/utility-functions.helper';
import { KafkaPublisherOptions, KafkaTopicCreationOptions } from '../../domain/interfaces/kafka-request-options.interface';

export class KafkaProducerInfrastructure {
  private producer: Producer;
  private admin: Admin;

  constructor (private kafka: Kafka) {
    this.producer = this.kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    this.admin = this.kafka.admin();
  }

  async connect () {
    await this.producer.connect();
  }

  async publish ({ topicName, message }: KafkaPublisherOptions) {
    await this.producer.send({ topic: topicName, messages: [{ value: message }] });
    LoggerTracerInfrastructure.log(`Message sent to topic ${topicName}`);
  }

  async createTopic ({ topicName }: KafkaTopicCreationOptions) {
    try {
      const existingTopics = await this.admin.listTopics();
      if (!existingTopics.includes(topicName)) {
        await this.admin.createTopics({ topics: [{ topic: topicName, numPartitions: 3, replicationFactor: 2 }], validateOnly: false });
      }
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error creating topic ${topicName}: ${getErrorMessage(error)}`, 'error');
    }
  }

  async disconnect () {
    await this.producer.disconnect();
  }
}
