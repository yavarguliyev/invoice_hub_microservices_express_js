import { RedisCacheKey } from './redis-cache-keys.type';
import { ClientIds } from '../../domain/enums/events.enum';
import { EventMessage } from '../../domain/interfaces/distributed-transaction.interface';

export type EventDecoratorOptions = {
  topicName: (args: EventMessage[]) =>  string,
  prepareMessage?: (result: unknown, args: unknown[]) => unknown | unknown[];
};

export type EventKeyTemplatesOptions = {
  clientId: ClientIds,
  keyTemplate: RedisCacheKey;
};
