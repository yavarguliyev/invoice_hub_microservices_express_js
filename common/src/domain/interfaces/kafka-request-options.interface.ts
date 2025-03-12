import { GroupIds } from 'domain/enums/events.enum';

export interface KafkaRequestOptions {
  requestTopic: string;
  message: string;
  responseTopic: string;
  groupId?: GroupIds;
  timeoutMs?: number;
}

export interface KafkaInitOptions {
  clientId: string;
  groupId: string;
}

export interface KafkaResponse {
  correlationId: string;
  message: string;
}

export interface KafkaPublisherOptions {
  topicName: string;
  message: string;
}

export interface KafkaTopicCreationOptions {
  topicName: string;
}

export interface KafkaSubscriberOptions {
  topicName: string;
  handler: (message: string) => void;
  options?: KafkaGroupIdOptions
}

export interface KafkaIsSubscribedToOptions {
  topicName: string;
}

export interface KafkaGroupIdOptions {
  groupId?: GroupIds;
}

export interface KafkaHandleResponsedOptions {
  responseMessage: string;
}
