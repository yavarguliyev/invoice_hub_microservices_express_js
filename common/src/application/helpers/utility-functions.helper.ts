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
import { DistributedTransaction, SerializedTransaction } from '../../domain/interfaces/distributed-transaction.interface';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';
import { ProcessType } from '../../domain/enums/distributed-transaction.enum';

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

export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

export const prepareMessage = (result: unknown, args: unknown[], options?: {
  isManualCancel?: boolean;
  customFormatter?: (data: Record<string, unknown>) => Record<string, unknown>;
}): unknown => {
  if (options?.isManualCancel && args.length > 0) {
    return { transactionId: `manual-cancel-${args[0]}`, orderId: args[0] };
  }

  if (options?.customFormatter && typeof result === 'object') {
    return options.customFormatter(result as Record<string, unknown>);
  }

  const [firstArg] = args;
  if (typeof firstArg === 'string') {
    try {
      const parsedArg = JSON.parse(firstArg);
      if ('correlationId' in parsedArg) {
        return { ...parsedArg, message: JSON.stringify(result) };
      }
    } catch (error) {
      LoggerTracerInfrastructure.log(getErrorMessage(error));
    }
  }

  return result;
};

export const toProcessType = (value: string): ProcessType => {
  if (Object.values(ProcessType).includes(value as ProcessType)) {
    return value as ProcessType;
  }

  throw new Error(`Invalid process type: ${value}`);
}

export const isSerializedTransaction = (obj: unknown): obj is SerializedTransaction => {
  if (!obj || typeof obj !== 'object') return false;

  const transaction = obj as Record<string, unknown>;

  return (
    typeof transaction.transactionId === 'string' &&
    typeof transaction.processType === 'string' &&
    typeof transaction.status === 'string' &&
    typeof transaction.startedAt === 'string' &&
    (transaction.completedAt === undefined || typeof transaction.completedAt === 'string') &&
    typeof transaction.currentStep === 'number' &&
    typeof transaction.initiatedBy === 'string' &&
    transaction.payload !== undefined &&
    Array.isArray(transaction.steps)
  );
}

export const deserializeTransaction = (serialized: SerializedTransaction): DistributedTransaction => {
  return {
    ...serialized,
    processType: toProcessType(serialized.processType),
    startedAt: new Date(serialized.startedAt),
    completedAt: serialized.completedAt ? new Date(serialized.completedAt) : undefined,
    steps: serialized.steps.map(step => ({
      ...step,
      startedAt: step.startedAt ? new Date(step.startedAt) : undefined,
      completedAt: step.completedAt ? new Date(step.completedAt) : undefined
    }))
  };
}
