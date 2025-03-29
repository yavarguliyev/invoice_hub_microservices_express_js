import { createClient, RedisClientType } from 'redis';

import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';
import { safelyInitializeService, ensureInitialized } from '../../application/helpers/utility-functions.helper';
import { redisConfig } from '../../core/configs/redis.config';
import { ClientIds } from '../../domain/enums/events.enum';
import {
  RedisBaseOptions, RedisRequestOptions, RedisSetOptions, RedisSetHashOptions, RedisDeleteKeysOptions
} from '../../domain/interfaces/redis-request-options.interface';

export class RedisInfrastructure {
  private clientMap: Map<ClientIds, RedisClientType>;

  constructor () {
    this.clientMap = new Map();
  }

  async initialize ({ clientId }: RedisBaseOptions) {
    await safelyInitializeService({
      clientId,
      initializeFn: async () => {
        if (!this.clientMap.has(clientId)) {
          const client = createClient({
            socket: { host: redisConfig.REDIS_HOST, port: redisConfig.REDIS_PORT },
            password: redisConfig.REDIS_PASSWORD
          }) as RedisClientType;

          await client.connect();
          this.clientMap.set(clientId, client);
        }
      }
    });
  }

  async get<T> ({ clientId, key }: RedisRequestOptions) {
    const client = this.getClient({ clientId });
    const value = await client?.get(key);

    if (!value) {
      return;
    }

    return value as unknown as T;
  }

  async getHashKeys ({ clientId, key }: RedisRequestOptions) {
    const client = ensureInitialized({ connection: this.getClient({ clientId }), clientId });
    const keys = await client?.sMembers(key);

    return keys || [];
  }

  async set ({ clientId, key, value, ttl }: RedisSetOptions) {
    const client = this.getClient({ clientId });
  
    if (ttl) {
      await client?.set(key, value, { EX: ttl });
    } else {
      await client?.set(key, value);
    }
  }

  async setHashKeys ({ clientId, key, cacheKey }: RedisSetHashOptions) {
    const client = ensureInitialized({ connection: this.getClient({ clientId }), clientId });
    await client?.sAdd(key, cacheKey);
  }

  async delete ({ clientId, key }: RedisRequestOptions) {
    const client = ensureInitialized({ connection: this.getClient({ clientId }), clientId });
    await client?.unlink(key);
  }

  async deleteKeys ({ clientId, keys }: RedisDeleteKeysOptions) {
    const client = ensureInitialized({ connection: this.getClient({ clientId }), clientId });
    if (keys.length) {
      await client?.unlink(keys);
    }
  }

  async disconnect ({ clientId }: RedisBaseOptions) {
    const client = this.clientMap.get(clientId);

    if (client && client.isOpen) {
      await client.disconnect();
      this.clientMap.delete(clientId);
    }
  }

  async isConnected ({ clientId }: RedisBaseOptions) {
    return this.clientMap.get(clientId)?.isOpen || false;
  }

  private getClient ({ clientId }: RedisBaseOptions) {
    return this.clientMap.get(clientId);
  }

  async getKeysByPattern ({ clientId, pattern }: { clientId: ClientIds; pattern: string }): Promise<string[]> {
    const client = ensureInitialized({ connection: this.getClient({ clientId }), clientId });
    return client?.keys(pattern) || [];
  }
}
