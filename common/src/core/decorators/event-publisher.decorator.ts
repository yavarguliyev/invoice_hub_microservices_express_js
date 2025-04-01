import { Container } from 'typedi';

import { EventDecoratorOptions } from '../../core/types/event-publisher-keys.type';
import { KafkaInfrastructure } from '../../infrastructure/kafka/kafka.infrastructure';

export function EventPublisherDecorator<T extends (...args: unknown[]) => Promise<unknown>>(options: EventDecoratorOptions) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as T;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const { prepareMessage } = options;

      const kafka = Container.get(KafkaInfrastructure);
      const result = await originalMethod.apply(this, args);
      const payload = prepareMessage ? prepareMessage(result, args) : result;

      if (payload && typeof payload === 'object' && 'topicName' in payload && 'message' in payload) {
        await kafka.publish({ topicName: payload.topicName as string, message: JSON.stringify(payload.message) });
      }

      return result as ReturnType<T>;
    };

    return descriptor;
  };
}
