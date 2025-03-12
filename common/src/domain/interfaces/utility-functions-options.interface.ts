import { Constructable } from 'typedi';
import { ObjectLiteral, Repository } from 'typeorm';

import { Version } from '../../core/types/version-control.type';
import { GetQueryResultsArgs } from '../../core/inputs/get-query-results.args';
import { ClientIds } from '../../domain/enums/events.enum';

export interface RegisterServiceOptions<T> {
  id: string;
  service: Constructable<T>;
  isSingleton?: boolean;
};

export interface RetryOptions {
  serviceName: string;
  maxRetries: number;
  retryDelay: number;
  onRetry?: (attempt: number) => void;
  onFailure?: (error: Error, attempt: number) => void;
};

export interface ServiceInitializationOptions {
  clientId: ClientIds;
  initializeFn: () => Promise<void>;
};

export interface QueryResultsOptions<T extends ObjectLiteral, DTO, RelatedDTO = unknown> {
  repository: Repository<T>;
  query: GetQueryResultsArgs;
  dtoClass: new () => DTO;
  relatedEntity?: {
    RelatedDtoClass: new () => RelatedDTO;
    relationField: keyof T;
  };
};

export interface CreateVersionedRouteOptions {
  controllerPath: string;
  version: Version;
};

export interface EnsureInitializedOptions<T> {
  connection: T | undefined;
  clientId: ClientIds;
};

export interface GenerateCacheKeyOptions {
  keyTemplate: string;
  args: unknown[];
};

export interface HandleProcessSignalsOptions<Args extends unknown[]> {
  shutdownCallback: (...args: Args) => Promise<void>;
  callbackArgs: Args;
};
