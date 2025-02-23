import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';

import { LoggerTracerInfrastructure } from './logger-tracer.infrastructure';

export class KafkaInfrastructure {
  private static kafka?: Kafka;
  private static producer?: Producer;
  private static consumer?: Consumer;

  static async initialize (): Promise<void> {
    if (!KafkaInfrastructure.kafka) {
      try {
        const brokers = [process.env.KAFKA_BROKER || 'localhost:9092'];

        KafkaInfrastructure.kafka = new Kafka({ clientId: 'my-app', brokers });

        KafkaInfrastructure.producer = KafkaInfrastructure.kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
        KafkaInfrastructure.consumer = KafkaInfrastructure.kafka.consumer({ groupId: 'my-group' });

        await KafkaInfrastructure.producer.connect();
        await KafkaInfrastructure.consumer.connect();

        LoggerTracerInfrastructure.log('Kafka initialized and connected.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        LoggerTracerInfrastructure.log(`Failed to initialize Kafka: ${errorMessage}`, 'error');

        throw error;
      }
    }
  }

  static async publish (topicName: string, message: string): Promise<void> {
    if (!KafkaInfrastructure.producer) {
      throw new Error('Kafka producer not initialized');
    }

    try {
      await KafkaInfrastructure.producer.send({ topic: topicName, messages: [{ value: message }] });
      LoggerTracerInfrastructure.log(`Message sent to topic ${topicName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerTracerInfrastructure.log(`Failed to send message to ${topicName}: ${errorMessage}`, 'error');

      throw error;
    }
  }

  static async subscribe (topicName: string): Promise<void> {
    if (!KafkaInfrastructure.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    try {
      await KafkaInfrastructure.consumer.subscribe({ topic: topicName, fromBeginning: true });
      await KafkaInfrastructure.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const messageHandler = { topic, partition, offset: message.offset, value: message.value?.toString() };
          LoggerTracerInfrastructure.log(`Received message: ${JSON.stringify(messageHandler)}`);
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerTracerInfrastructure.log(`Failed to subscribe to ${topicName}: ${errorMessage}`, 'error');

      throw error;
    }
  }

  static async disconnect (): Promise<void> {
    try {
      if (this.consumer && this.producer) {
        LoggerTracerInfrastructure.log('Disconnecting Kafka consumer and producer...');

        await this.consumer.disconnect();
        await this.producer.disconnect();

        LoggerTracerInfrastructure.log('Kafka disconnected successfully.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      LoggerTracerInfrastructure.log(`Failed to disconnect Kafka: ${errorMessage}`, 'error');

      throw err;
    }
  }

  static isConnected (): boolean {
    return !!KafkaInfrastructure.producer && !!KafkaInfrastructure.consumer;
  }
}
