import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';

export default class KafkaInfrastructure {
  private static kafka?: Kafka;
  private static producer?: Producer;
  private static consumer?: Consumer;

  static async initialize (): Promise<void> {
    if (!KafkaInfrastructure.kafka) {
      try {
        KafkaInfrastructure.kafka = new Kafka({
          clientId: 'my-app',
          brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
          connectionTimeout: 5000,  
          requestTimeout: 30000,  
          retry: { retries: 5 },  
        });
        
        KafkaInfrastructure.producer = KafkaInfrastructure.kafka.producer({
          createPartitioner: Partitioners.LegacyPartitioner
        });
        
        KafkaInfrastructure.consumer = KafkaInfrastructure.kafka.consumer({ 
          groupId: 'my-group',
          sessionTimeout: 30000,  
          heartbeatInterval: 3000,  
          maxWaitTimeInMs: 5000,  
          metadataMaxAge: 10000,  
          retry: { initialRetryTime: 300, retries: 8 }
        });
        
        await KafkaInfrastructure.consumer.connect();
        await KafkaInfrastructure.producer.connect();

        console.log('Kafka initialized and connected.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Failed to initialize Kafka: ${errorMessage}`);
        throw error;
      }
    }
  }

  static async ensureTopicExists (topicName: string): Promise<void> {
    if (!KafkaInfrastructure.kafka) {
      throw new Error('Kafka instance not initialized');
    }

    try {
      const admin = KafkaInfrastructure.kafka.admin();
      await admin.connect();

      const existingTopics = await admin.listTopics();
      if (!existingTopics.includes(topicName)) {
        await admin.createTopics({ topics: [{ topic: topicName }] });
        console.log(`Topic ${topicName} created.`);
      } else {
        console.log(`Topic ${topicName} already exists.`);
      }

      await admin.disconnect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Error checking or creating topic: ${errorMessage}`);
      throw error;
    }
  }

  static async publish (topicName: string, message: string): Promise<void> {
    if (!KafkaInfrastructure.producer) {
      throw new Error('Kafka producer not initialized');
    }

    try {
      await KafkaInfrastructure.producer.send({
        topic: topicName,
        messages: [{ value: message }],
      });
      console.log(`Message sent to topic ${topicName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to send message to ${topicName}: ${errorMessage}`);
      throw error;
    }
  }

  static async subscribe (topicName: string, callback: (message: string) => void): Promise<void> {
    if (!KafkaInfrastructure.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    try {
      await KafkaInfrastructure.consumer.subscribe({ topic: topicName, fromBeginning: true });
      await KafkaInfrastructure.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          callback(message.value?.toString() || '');
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to subscribe to ${topicName}: ${errorMessage}`);
      throw error;
    }
  }

  static async disconnect (): Promise<void> {
    try {
      if (KafkaInfrastructure.producer) {
        await KafkaInfrastructure.producer.disconnect();
        console.log('Kafka producer disconnected.');
      }

      if (KafkaInfrastructure.consumer) {
        await KafkaInfrastructure.consumer.disconnect();
        console.log('Kafka consumer disconnected.');
      }

      if (KafkaInfrastructure.kafka) {
        console.log('Kafka instance disconnected.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to disconnect Kafka: ${errorMessage}`);
      throw error;
    }
  }

  static isConnected(): boolean {
    return !!KafkaInfrastructure.producer && !!KafkaInfrastructure.consumer;
  }
}