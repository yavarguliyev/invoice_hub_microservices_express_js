import { EventDecoratorOptions } from '../types/event-publisher-keys.type';
import { REDIS_CACHE_KEYS, RedisDecoratorOption } from '../types/redis-cache-keys.type';
import { ClientIds } from '../../domain/enums/events.enum';

const EVENT_PUBLISHER_OPERATION: EventDecoratorOptions = {
  topicName: (args) => args[0].topicName, prepareMessage: (data) => data
};

const REDIS_ROLE_LIST: RedisDecoratorOption = { clientId: ClientIds.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ROLE_GET_LIST };
const REDIS_USER_LIST: RedisDecoratorOption = { clientId: ClientIds.AUTH_SERVICE, keyTemplate: REDIS_CACHE_KEYS.USER_GET_LIST };
const REDIS_INVOICE_LIST: RedisDecoratorOption = { clientId: ClientIds.INVOICE_SERVICE, keyTemplate: REDIS_CACHE_KEYS.INVOICE_GET_LIST };
const REDIS_ORDER_LIST: RedisDecoratorOption = { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST };

export {
  EVENT_PUBLISHER_OPERATION,
  REDIS_ROLE_LIST,
  REDIS_USER_LIST,
  REDIS_INVOICE_LIST,
  REDIS_ORDER_LIST
};
