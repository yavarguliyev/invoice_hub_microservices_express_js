import { ClientIds } from '../enums/events.enum';

export interface RedisBaseOptions {
  clientId: ClientIds;
}

export interface RedisKeyOptions extends RedisBaseOptions {
  key: string;
}

export interface RedisRequestOptions extends RedisKeyOptions {}

export interface RedisSetOptions extends RedisKeyOptions {
  value: string;
  ttl?: number;
}

export interface RedisSetHashOptions extends RedisKeyOptions {
  cacheKey: string;
}

export interface RedisDeleteKeysOptions extends RedisBaseOptions {
  keys: string[];
}
