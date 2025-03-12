import { Container } from 'typedi';

import { EventDecoratorOptions } from '../../core/types/event-publisher-keys.type';
import { RedisInfrastructure } from '../../infrastructure/redis/redis.infrastructure';
import { KafkaInfrastructure } from '../../infrastructure/kafka/kafka.infrastructure';

export function EventPublisherDecorator<T extends (...args: unknown[]) => Promise<unknown>>(options: EventDecoratorOptions) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as T;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const { topicName, prepareMessage, keyTemplates } = options;

      const result = await originalMethod.apply(this, args);

      if (topicName) {
        const kafka = Container.get(KafkaInfrastructure);
        const message = prepareMessage ? prepareMessage(result, args) : result;
        await kafka.publish({ topicName, message: JSON.stringify(message) });
      }

      if (keyTemplates) {
        const redis = Container.get(RedisInfrastructure);

        for (const options of keyTemplates) {
          const { clientId, keyTemplate } = options;

          const keys = await redis.getHashKeys({ clientId, key: keyTemplate });
          if (keys.length) {
            await redis.deleteKeys({ clientId, keys });
          }
        }
      }

      return result as ReturnType<T>;
    };

    return descriptor;
  };
}
