import { Container } from 'typedi';

import { generateCacheKey } from '../../application/helpers/utility-functions.helper';
import { RedisDecoratorOption } from '../../core/types/redis-cache-keys.type';
import { RedisInfrastructure } from '../../infrastructure/redis/redis.infrastructure';

export function RedisDecorator (options: RedisDecoratorOption) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<{ payloads: [] }>;

    descriptor.value = async function (...args: Parameters<typeof originalMethod>): Promise<{ payloads: [] }> {
      const { clientId, keyTemplate } = options;
      const { cacheKey: key, ttl } = generateCacheKey({ keyTemplate, args });

      const redis = Container.get(RedisInfrastructure);
      const cachedValue = await redis.get<string>({ clientId, key });
      if (cachedValue) {
        return typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
      }

      const result = await originalMethod.apply(this, args);

      await redis.set({ clientId, key, value: JSON.stringify(result), ttl });
      await redis.setHashKeys({ clientId, key: keyTemplate, cacheKey: key });

      return result;
    };

    return descriptor;
  };
}
