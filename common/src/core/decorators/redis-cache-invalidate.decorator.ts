import { Container } from 'typedi';

import { RedisDecoratorOption } from '../types/redis-cache-keys.type';
import { RedisInfrastructure } from '../../infrastructure/redis/redis.infrastructure';

export function RedisCacheInvalidateDecorator (options: RedisDecoratorOption) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<{ payloads: [] }>;

    descriptor.value = async function (...args: Parameters<typeof originalMethod>): Promise<{ payloads: [] }> {
      const { clientId, keyTemplate } = options;

      const redis = Container.get(RedisInfrastructure);
      const keys = await redis.getHashKeys({ clientId, key: keyTemplate });
      if (keys.length) {
        await redis.deleteKeys({ clientId, keys });
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
