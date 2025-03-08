import dotenv from 'dotenv';

import { REDIS_CACHE_KEYS, RedisDecoratorOption } from '../types/redis-cache-keys.type';
import { ServicesName } from '../../domain/enums/services-names.enum';
import { RoleDto } from '../../domain/dtos/role.dto';
import { UserDto } from '../../domain/dtos/user.dto';
import { InvoiceDto } from '../../domain/dtos/invoice.dto';
import { OrderDto } from '../../domain/dtos/order.dto';

dotenv.config();

export const redisConfig = {
  REDIS_PORT: Number(process.env.REDIS_PORT!),
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DEFAULT_CACHE_TTL: Number(process.env.REDIS_DEFAULT_CACHE_TTL) || 3600,
} as const;

export const redisCacheConfig = {
  ROLE_LIST: { serviceName: ServicesName.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ROLE_GET_LIST } as RedisDecoratorOption<RoleDto>,
  USER_LIST: { serviceName: ServicesName.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.USER_GET_LIST } as RedisDecoratorOption<UserDto>,
  INVOICE_LIST: { serviceName: ServicesName.INVOICE_SERVICE, keyTemplate: REDIS_CACHE_KEYS.INVOICE_GET_LIST } as RedisDecoratorOption<InvoiceDto>,
  ORDER_LIST: { serviceName: ServicesName.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST } as RedisDecoratorOption<OrderDto>
};
