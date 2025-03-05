import { Kafka, Producer, Partitioners } from 'kafkajs';

import { LoggerTracerInfrastructure } from '../';

export class KafkaProducerInfrastructure {
  private producer: Producer;

  constructor (private kafka: Kafka) {
    this.producer = this.kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
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

  async disconnect (): Promise<void> {
    await this.producer.disconnect();
  }
}
