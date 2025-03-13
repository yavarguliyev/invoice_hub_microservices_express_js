import { GroupIds, KafkaRequestOptions, OrderDto, Subjects } from '@invoice-hub/common';

export const buildKafkaRequestOptionsHelper = ({ userId }: OrderDto): KafkaRequestOptions[] => {
  return [
    {
      requestTopic: Subjects.FETCH_USER_REQUEST,
      message: JSON.stringify({ userId }),
      responseTopic: Subjects.FETCH_USER_RESPONSE,
      groupId: GroupIds.ORDER_USER_FETCH_GROUP
    }
  ];
};
