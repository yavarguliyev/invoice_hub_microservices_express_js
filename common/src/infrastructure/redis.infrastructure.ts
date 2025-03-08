import { createClient, RedisClientType } from 'redis';

import { safelyInitializeService, ensureInitialized } from '../application/helpers/utility-functions.helper';
import { ServicesName } from '../domain/enums/services-names.enum';
import { RedisConnectionConfig } from '../domain/interfaces/redis-connection-config.interface';
import { LoggerTracerInfrastructure } from '../infrastructure/logger-tracer.infrastructure';
import { redisConfig } from '../core/configs/redis.config';

export class RedisInfrastructure {
  private static clientMap: Map<ServicesName, RedisClientType> = new Map();

  static async initialize ({ serviceName }: RedisConnectionConfig): Promise<void> {
    await safelyInitializeService({
      serviceName: serviceName,
      initializeFn: async () => {
        if (!RedisInfrastructure.clientMap.has(serviceName)) {
          const client = createClient({ socket: { host: redisConfig.REDIS_HOST, port: redisConfig.REDIS_PORT }, password: redisConfig.REDIS_PASSWORD }) as RedisClientType;

          await client.connect();
          RedisInfrastructure.clientMap.set(serviceName, client);
        }
      }
    });
  }

  static async get<T = string> (serviceName: ServicesName, key: string): Promise<T | undefined> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });
    const value = await client?.get(key);

    return value ? (JSON.parse(value) as T) : undefined;
  }

  static async getHashKeys (serviceName: ServicesName, key: string): Promise<string[]> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });
    const keys = await client?.sMembers(key);

    return keys || [];
  }

  static async set (serviceName: ServicesName, key: string, value: string, ttl?: number): Promise<void> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });

    if (ttl) {
      await client?.setEx(key, ttl, value);
    } else {
      await client?.set(key, value);
    }
  }

  static async setHashKeys (serviceName: ServicesName, key: string, cacheKey: string): Promise<void> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });

    await client?.sAdd(key, cacheKey);
  }

  static async delete (serviceName: ServicesName, key: string): Promise<void> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });

    await client?.del(key);
  }

  static async deleteKeys(serviceName: ServicesName, keys: string[]): Promise<void> {
    const client = ensureInitialized({ connection: RedisInfrastructure.getClient(serviceName), serviceName });

    if (keys.length) {
      await client.del(keys);
    }
  }

  static async disconnect (serviceName: ServicesName): Promise<void> {
    const client = RedisInfrastructure.clientMap.get(serviceName);

    if (client && client.isOpen) {
      try {
        await client.disconnect();
        RedisInfrastructure.clientMap.delete(serviceName);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        LoggerTracerInfrastructure.log(`Error during Redis shutdown for ${serviceName}: ${errorMessage}`, 'error');
      }
    }
  }

  static async isConnected (serviceName: ServicesName): Promise<boolean> {
    const client = RedisInfrastructure.clientMap.get(serviceName);
    return client ? client.isOpen : false;
  }

  private static getClient (serviceName: ServicesName): RedisClientType | undefined {
    return RedisInfrastructure.clientMap.get(serviceName);
  }
}
