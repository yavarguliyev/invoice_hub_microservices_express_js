import { ObjectLiteral } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';

import { ContainerHelper } from '../ioc/helpers/container.helper';
import { redisConfig } from '../../core/configs/redis.config';
import { RedisCacheKeys } from '../../core/types/redis-cache-keys.type';
import { QueryResultPayload } from '../../core/types/query-results.type';
import {
  HandleProcessSignalsOptions,
  CreateVersionedRouteOptions,
  RegisterServiceOptions,
  QueryResultsOptions,
  GenerateCacheKeyOptions,
  ServiceInitializationOptions,
  EnsureInitializedOptions
} from '../../domain/interfaces/utility-functions-options.interface';
import { KafkaResponse } from '../../domain/interfaces/kafka-request-options.interface';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';

export const safelyInitializeService = async ({ clientId, initializeFn }: ServiceInitializationOptions): Promise<void> => {
  try {
    await initializeFn();
  } catch (error) {
    LoggerTracerInfrastructure.log(`${clientId} initialization failed: ${getErrorMessage(error)}`, 'error');

    throw error;
  }
};

export const ensureInitialized = <T> ({ connection, clientId }: EnsureInitializedOptions<T>): T => {
  if (!connection) {
    throw new Error(`${clientId} is not initialized. Call initialize() first.`);
  }

  return connection;
};

export const handleProcessSignals = <Args extends unknown[]> ({ shutdownCallback, callbackArgs }: HandleProcessSignalsOptions<Args>): void => {
  ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => process.on(signal, async () => await shutdownCallback(...callbackArgs)));
};

export const createVersionedRoute = ({ controllerPath, version }: CreateVersionedRouteOptions) => {
  return `/api/${version}${controllerPath}`;
};

export const registerService = <T> ({ id, service, isSingleton = true }: RegisterServiceOptions<T>): void => {
  isSingleton ? ContainerHelper.addSingleton<T>(id, service) : ContainerHelper.addTransient<T>(id, service);
};

export const generateCacheKey = ({ keyTemplate, args }: GenerateCacheKeyOptions): RedisCacheKeys => {
  const ttl = redisConfig.REDIS_DEFAULT_CACHE_TTL;
  const argsHash = crypto.createHash('md5').update(JSON.stringify(args)).digest('hex');
  const cacheKey = `${keyTemplate}:${argsHash}`;

  return { cacheKey, ttl };
};

export const queryResults = async <T extends ObjectLiteral, DTO, RelatedDTO = unknown> (args: QueryResultsOptions<T, DTO, RelatedDTO>): Promise<QueryResultPayload<DTO>> => {
  const { repository, query, dtoClass, relatedEntity } = args;
  const { page = 1, limit = 10, filters = {}, order = {} } = query;

  const [orderField, orderDirection] = Object.entries(order)[0] ?? ['createdAt', 'DESC'];

  const offset = (page - 1) * limit;
  const queryBuilder = repository.createQueryBuilder('entity');

  if (Object.keys(filters).length) {
    queryBuilder.where(Object.entries(filters).map(([key]) => `entity.${key} = :${key}`).join(' AND '), filters);
  }

  queryBuilder.addOrderBy(`entity.${orderField}`, orderDirection).take(limit).skip(offset);

  let relationAlias: string | undefined;
  if (relatedEntity?.relationField) {
    relationAlias = `__${String(relatedEntity.relationField)}__`;
    queryBuilder.leftJoinAndSelect(`entity.${String(relatedEntity.relationField)}`, relationAlias);
  }

  const [items, total] = await queryBuilder.getManyAndCount();

  const dtos: DTO[] = items.map((item) => {
    const dto = plainToInstance(dtoClass, item, { excludeExtraneousValues: true }) as DTO;

    if (relatedEntity?.relationField && relationAlias && item[relationAlias]) {
      Object.assign(dto as Record<string, unknown>, {
        [String(relatedEntity.relationField)]: plainToInstance(relatedEntity.RelatedDtoClass, item[relationAlias], { excludeExtraneousValues: true })
      });
    }

    return dto;
  });

  return { payloads: dtos, total };
};

export function getErrorMessage (error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const prepareMessage = (result: unknown, args: unknown[]) => {
  const [firstArg] = args;

  if (typeof firstArg === 'string') {
    const parsedArg = JSON.parse(firstArg);

    if ('correlationId' in parsedArg) {
      return parsedArg as KafkaResponse;
    }

    return result;
  }

  return result;
};
