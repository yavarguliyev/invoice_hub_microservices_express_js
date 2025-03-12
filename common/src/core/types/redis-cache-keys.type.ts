import { ClientIds } from '../../domain/enums/events.enum';
import { RoleDto } from '../../domain/dtos/role.dto';
import { UserDto } from '../../domain/dtos/user.dto';
import { InvoiceDto } from '../../domain/dtos/invoice.dto';
import { OrderDto } from '../../domain/dtos/order.dto';

export const REDIS_CACHE_KEYS = {
  INVOICE_GET_LIST: 'invoice:get:list',
  ORDER_GET_LIST: 'order:get:list',
  ROLE_GET_LIST: 'role:get:list',
  USER_GET_LIST: 'user:get:list'
} as const;

export type RedisCacheKeys = { cacheKey: string, ttl: number };
export type RedisCacheKey = typeof REDIS_CACHE_KEYS[keyof typeof REDIS_CACHE_KEYS];
export type RedisDecoratorOption<T> = { clientId: ClientIds, keyTemplate: RedisCacheKey; };

export type RedisCacheConfig = {
  ROLE_LIST: RedisDecoratorOption<RoleDto>;
  USER_LIST: RedisDecoratorOption<UserDto>;
  INVOICE_LIST: RedisDecoratorOption<InvoiceDto>;
  ORDER_LIST: RedisDecoratorOption<OrderDto>;
};
