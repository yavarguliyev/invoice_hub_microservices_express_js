import { GroupIds, KafkaRequestOptions, Subjects } from '@invoice-hub/common';

import { Invoice } from 'domain/entities/invoice.entity';

export const buildKafkaRequestOptionsHelper = ({ orderId, userId }: Invoice): KafkaRequestOptions[] => {
  return [
    {
      requestTopic: Subjects.FETCH_ORDER_REQUEST,
      message: JSON.stringify({ orderId }),
      responseTopic: Subjects.FETCH_ORDER_RESPONSE,
      groupId: GroupIds.INVOICE_ORDER_FETCH_GROUP
    },
    {
      requestTopic: Subjects.FETCH_USER_REQUEST,
      message: JSON.stringify({ userId }),
      responseTopic: Subjects.FETCH_USER_RESPONSE,
      groupId: GroupIds.INVOICE_USER_FETCH_GROUP
    }];
};
