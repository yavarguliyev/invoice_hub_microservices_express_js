import { GroupIds, KafkaRequestOptions, Subjects } from '@invoice-hub/common';

import { Order } from 'domain/entities/order.entity';

export const buildKafkaRequestOptionsHelper = ({ userId }: Order): KafkaRequestOptions[] => {
  return [
    {
      requestTopic: Subjects.FETCH_USER_REQUEST,
      message: JSON.stringify({ userId }),
      responseTopic: Subjects.FETCH_USER_RESPONSE,
      groupId: GroupIds.ORDER_USER_FETCH_GROUP
    }
  ];
};
