import { compareValues, generateCacheKey } from '../../application/helpers/utility-functions.helper';
import { RedisDecoratorOption } from '../../core/types/redis-cache-keys.type';
import { RedisInfrastructure } from '../../infrastructure/redis.infrastructure';

export function RedisDecorator<T> (options: RedisDecoratorOption<T>) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<{ payloads: T[] }>;

    descriptor.value = async function (...args: Parameters<typeof originalMethod>): Promise<{ payloads: T[] }> {
      const { serviceName, keyTemplate, sortBy = 'id', sortOrder = 'desc' } = options;
      const { cacheKey, ttl } = generateCacheKey({ keyTemplate, args });

      const cachedValue = await RedisInfrastructure.get(serviceName, cacheKey);
      if (cachedValue) {
        return typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      if (sortBy && Array.isArray(result.payloads)) {
        result.payloads.sort((a: T, b: T) => compareValues({ a, b, key: sortBy as keyof T, sortOrder }));
      }

      await RedisInfrastructure.set(serviceName, cacheKey, JSON.stringify(result), ttl);
      await RedisInfrastructure.setHashKeys(serviceName, keyTemplate, cacheKey);

      return result;
    };

    return descriptor;
  };
}
