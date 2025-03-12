import { RedisCacheKey } from './redis-cache-keys.type';
import { Subjects } from '../../domain/enums/events.enum';
import { ClientIds } from '../../domain/enums/events.enum';

export type EventDecoratorOptions = {
  topicName: Subjects,
  prepareMessage?: (result: unknown, args: unknown[]) => unknown;
  keyTemplates?: EventKeyTemplatesOptions[];
};

export type EventKeyTemplatesOptions = {
  clientId: ClientIds,
  keyTemplate: RedisCacheKey;
};
