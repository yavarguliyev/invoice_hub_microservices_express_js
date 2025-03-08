import { ObjectLiteral } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';

import { ContainerHelper } from '../ioc/helpers/container.helper';
import { redisConfig } from '../../core/configs/redis.config';
import { RedisCacheKeys } from '../../core/types/redis-cache-keys.type';
import { HandleProcessSignalsOptions } from '../../domain/interfaces/handle-process-signals-options.interface';
import { CreateVersionedRouteOptions } from '../../domain/interfaces/create-versioned-route-options.interface';
import { RegisterServiceOptions } from '../../domain/interfaces/register-service-options.interface';
import { QueryResultsOptions } from '../../domain/interfaces/query-results-options.interface';
import { GenerateCacheKeyOptions } from './../../domain/interfaces/generate-cache-key-options.interface';
import { ServiceInitializationOptions } from '../../domain/interfaces/service-initialization-options.interface';
import { EnsureInitializedOptions } from '../../domain/interfaces/ensure-initialized-options.interface';
import { CompareValuesOptions } from '../../domain/interfaces/compare-values-options.interface';
import { LoggerTracerInfrastructure } from '../../infrastructure/logger-tracer.infrastructure';

export const safelyInitializeService = async ({ serviceName, initializeFn }: ServiceInitializationOptions): Promise<void> => {
  try {
    await initializeFn();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

    LoggerTracerInfrastructure.log(`${serviceName} initialization failed: ${errorMessage}`, 'error');
    throw err;
  }
};

export const ensureInitialized = <T> ({ connection, serviceName }: EnsureInitializedOptions<T>): T => {
  if (!connection) {
    throw new Error(`${serviceName} is not initialized. Call initialize() first.`);
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

export const compareValues = <T> ({ a, b, key, sortOrder }: CompareValuesOptions<T>): number => {
  const valA = a[key];
  const valB = b[key];

  if (typeof valA === 'string' && typeof valB === 'string') {
    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  } else if (typeof valA === 'number' && typeof valB === 'number') {
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  } else if (valA instanceof Date && valB instanceof Date) {
    return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
  } else {
    return 0;
  }
};

export const queryResults = async <T extends ObjectLiteral, DTO, RelatedDTO = unknown> (
  { repository, query, dtoClass, relatedEntity }: QueryResultsOptions<T, DTO, RelatedDTO>
): Promise<{ payloads: DTO[]; total: number }> => {
  const { page = 1, limit = 10, filters = {}, order = {} } = query;
  const [orderField, orderDirection] = Object.entries(order)[0] ?? ['id', 'DESC'];

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
