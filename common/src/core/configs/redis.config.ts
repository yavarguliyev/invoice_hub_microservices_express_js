import { config } from 'dotenv';

import { REDIS_CACHE_KEYS, RedisCacheConfig } from '../types/redis-cache-keys.type';
import { ClientIds, GroupIds } from '../../domain/enums/events.enum';

config();

export const redisConfig = {
  REDIS_PORT: Number(process.env.REDIS_PORT!),
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DEFAULT_CACHE_TTL: Number(process.env.REDIS_DEFAULT_CACHE_TTL) || 3600,
};

export const redisCacheConfig: RedisCacheConfig & { DEFAULT_GROUP_ID: string } = {
  ROLE_LIST: { clientId: ClientIds.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ROLE_GET_LIST },
  USER_LIST: { clientId: ClientIds.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.USER_GET_LIST },
  INVOICE_LIST: { clientId: ClientIds.INVOICE_SERVICE, keyTemplate: REDIS_CACHE_KEYS.INVOICE_GET_LIST },
  ORDER_LIST: { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST },
  DEFAULT_GROUP_ID: GroupIds.BASE_GROUP
};
