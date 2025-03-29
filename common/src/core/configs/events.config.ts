import { EventDecoratorOptions } from '../types/event-publisher-keys.type';
import { prepareMessage } from '../../application/helpers/utility-functions.helper';
import { ClientIds, Subjects } from '../../domain/enums/events.enum';
import { REDIS_CACHE_KEYS } from '../../core/types/redis-cache-keys.type';
import { ProcessStepStatus, ProcessType } from '../../domain/enums/distributed-transaction.enum';
import { ResultMessage } from '../../domain/enums/result-message.enum';

const prepareCancellationMessage = (result: unknown, args: unknown[]): Record<string, unknown> => {
  const orderId = args[0];
  return {
    transactionId: `manual-cancel-${orderId}`,
    orderId
  };
};

export const eventPublisherConfig: Record<string, EventDecoratorOptions> = {
  USER_GET_BY: { topicName: Subjects.FETCH_USER_RESPONSE, prepareMessage },
  ORDER_GET_BY: { topicName: Subjects.FETCH_ORDER_RESPONSE, prepareMessage },
  ORDER_INVOICE_GENERATE: {
    topicName: Subjects.INVOICE_GENERATE,
    prepareMessage,
    keyTemplates: [
      { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST }
    ]
  },
  ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS: {
    topicName: Subjects.ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS,
    prepareMessage: prepareCancellationMessage,
    keyTemplates: [
      { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST }
    ]
  },
  ORDER_APPROVAL_STEP_GENERATE_INVOICE: {
    topicName: Subjects.ORDER_APPROVAL_STEP_GENERATE_INVOICE,
    prepareMessage,
    keyTemplates: [
      { clientId: ClientIds.ORDER_SERVICE, keyTemplate: REDIS_CACHE_KEYS.ORDER_GET_LIST }
    ]
  },
  TRANSACTION_STEP_COMPLETED: {
    topicName: Subjects.TRANSACTION_STEP_COMPLETED,
    prepareMessage: (result: unknown): Record<string, unknown> => {
      const data = result as Record<string, unknown>;
      return {
        transactionId: data.transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.COMPLETED,
        payload: {
          orderId: data.orderId,
          orderStatus: data.orderStatus
        }
      };
    }
  },
  TRANSACTION_STEP_FAILED: {
    topicName: Subjects.TRANSACTION_STEP_FAILED,
    prepareMessage: (result: unknown): Record<string, unknown> | undefined => {
      const data = result as Record<string, unknown>;
      if (!data || !data.transactionId) {
        return undefined;
      }
      
      return {
        transactionId: data.transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: data.stepName || Subjects.UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.FAILED,
        error: data.error || ResultMessage.FAILED_ORDER_UPDATE_STATUS
      };
    }
  },
  TRANSACTION_COMPENSATION_COMPLETED: {
    topicName: Subjects.TRANSACTION_COMPENSATION_COMPLETED,
    prepareMessage: (result: unknown): Record<string, unknown> => {
      const data = result as Record<string, unknown>;
      return {
        transactionId: data.transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.COMPENSATED
      };
    }
  },
  INVOICE_GET_BY: { topicName: Subjects.FETCH_INVOICE_RESPONSE, prepareMessage },
  INVOICE_CREATE_SUCCESS: { 
    topicName: Subjects.INVOICE_GENERATION_SUCCESS, 
    prepareMessage,
    keyTemplates: [
      { clientId: ClientIds.INVOICE_SERVICE, keyTemplate: REDIS_CACHE_KEYS.INVOICE_GET_LIST }
    ]
  },
  INVOICE_CREATE_FAILED: { 
    topicName: Subjects.INVOICE_GENERATION_FAILED, 
    prepareMessage 
  }
};
