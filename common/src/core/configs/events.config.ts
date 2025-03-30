import { EventDecoratorOptions } from '../types/event-publisher-keys.type';
import { prepareMessage } from '../../application/helpers/utility-functions.helper';
import { REDIS_CACHE_KEYS } from '../../core/types/redis-cache-keys.type';
import { ClientIds, Subjects } from '../../domain/enums/events.enum';

const userEventPublisher: Record<string, EventDecoratorOptions> = {
  USER_GET_BY: { topicName: Subjects.FETCH_USER_RESPONSE, prepareMessage }
};

const orderEventPublisher: Record<string, EventDecoratorOptions> = {
  ORDER_GET_BY: { topicName: Subjects.FETCH_ORDER_RESPONSE, prepareMessage },
  ORDER_INVOICE_GENERATE: {
    topicName: Subjects.INVOICE_GENERATE,
    prepareMessage,
    keyTemplates: [
      { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST }
    ]
  }
};

const invoiceEventPublisher: Record<string, EventDecoratorOptions> = {
  INVOICE_GET_BY: { topicName: Subjects.FETCH_INVOICE_RESPONSE, prepareMessage: (data) => data }
};

const transactionEventPublisher: Record<string, EventDecoratorOptions> = {
  TRANSACTION_STEP_COMPLETED: { topicName: Subjects.TRANSACTION_STEP_COMPLETED, prepareMessage: (data) => data },
  TRANSACTION_COMPENSATION_COMPLETED: { topicName: Subjects.TRANSACTION_COMPENSATION_COMPLETED, prepareMessage: (data) => data },
  TRANSACTION_STEP_FAILED: { topicName: Subjects.TRANSACTION_STEP_FAILED, prepareMessage: (data) => data }
};

export {
  userEventPublisher,
  orderEventPublisher,
  invoiceEventPublisher,
  transactionEventPublisher
};
