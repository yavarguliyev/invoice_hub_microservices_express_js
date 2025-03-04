import { ObjectLiteral } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { HandleProcessSignalsOptions } from '../../domain/interfaces/handle-process-signals-options.interface';
import { CreateVersionedRouteOptions } from '../../domain/interfaces/create-versioned-route-options.interface';
import { ContainerHelper } from '../ioc/helpers/container.helper';
import { RegisterServiceOptions } from '../../domain/interfaces/register-service-options.interface';
import { QueryResultsOptions } from '../../domain/interfaces/query-results-options.interface';

export const handleProcessSignals = <Args extends unknown[]> ({ shutdownCallback, callbackArgs }: HandleProcessSignalsOptions<Args>): void => {
  ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => process.on(signal, async () => await shutdownCallback(...callbackArgs)));
};

export const createVersionedRoute = ({ controllerPath, version }: CreateVersionedRouteOptions) => {
  return `/api/${version}${controllerPath}`;
};

export const registerService = <T> ({ id, service, isSingleton = true }: RegisterServiceOptions<T>): void => {
  isSingleton ? ContainerHelper.addSingleton<T>(id, service) : ContainerHelper.addTransient<T>(id, service);
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
