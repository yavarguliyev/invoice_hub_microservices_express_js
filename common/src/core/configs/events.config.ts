import { EventDecoratorOptions } from '../types/event-publisher-keys.type';
import { prepareMessage } from '../../application/helpers/utility-functions.helper';
import { ClientIds } from '../../domain/enums/events.enum';
import { Subjects } from '../../domain/enums/events.enum';
import { REDIS_CACHE_KEYS } from '../../core/types/redis-cache-keys.type';

export const eventPublisherConfig: Record<string, EventDecoratorOptions> = {
  USER_GET_BY: { topicName: Subjects.FETCH_USER_RESPONSE, prepareMessage },
  ORDER_GET_BY: { topicName: Subjects.FETCH_ORDER_RESPONSE, prepareMessage },
  ORDER_INVOICE_GENERATE: {
    topicName: Subjects.INVOICE_GENERATE, prepareMessage, keyTemplates: [
      { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST }
    ]
  }
};
