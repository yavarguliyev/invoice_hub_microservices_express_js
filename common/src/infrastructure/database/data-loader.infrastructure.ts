import { Repository, In, FindOptionsWhere } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import DataLoader from 'dataloader';
import { NotFoundError } from 'routing-controllers';

import { IEntityWithId } from '../../core/types/db-results.type';
import { IRelationParams, IEntityDataLoaderParams } from '../../domain/interfaces/data-loader-request-options.interface';


export class DataLoaderInfrastructure<Entity extends IEntityWithId> {
  private dataLoaders: Map<string, DataLoader<unknown, unknown>> = new Map();

  constructor (private readonly repository: Repository<Entity>) { }

  getDataLoader<D extends object, FetchField extends keyof Entity = keyof Entity> (
    params: Omit<IEntityDataLoaderParams<Entity, D>, 'repository'>
  ): DataLoader<Entity[FetchField], D> {
    const entityName = typeof params.entity === 'function' ? params.entity.name : params.entity;
    const relationsKey = JSON.stringify((params.relations || []).map(r => r.relation).sort());
    const fetchField = params.fetchField as FetchField;
    const loaderKey = `${entityName}_${relationsKey}_${String(fetchField)}`;

    if (this.dataLoaders.has(loaderKey)) {
      return this.dataLoaders.get(loaderKey)! as DataLoader<Entity[FetchField], D>;
    }

    const loader = new DataLoader<Entity[FetchField], D>(async (fetchValues) => {
      const data = await this.repository.find({
        where: { [fetchField]: In(fetchValues) } as FindOptionsWhere<Entity>,
        relations: params.relations?.map((r) => r.relation),
      });

      return fetchValues.map((value) => {
        const item = data.find((item) => item[fetchField] === value);

        if (!item) {
          throw new NotFoundError(`${entityName} with ${String(fetchField)} ${value} not found`);
        }

        return plainToInstance(
          params.Dto,
          { ...item, ...this.processRelations<D>(item, params.relations) },
          { excludeExtraneousValues: true }
        );
      });
    });

    this.dataLoaders.set(loaderKey, loader);
    return loader;
  }

  private processRelations<T extends object> (item: Entity, relations?: IRelationParams<T>[]): Partial<T> {
    if (!relations) return {} as Partial<T>;

    return relations.reduce<Partial<T>>((acc, { relation, relationDto }) => {
      if (relation in item) {
        let relationValue = item[relation as keyof Entity];

        if (relationValue instanceof Promise) {
          relationValue = item[`__${relation}__` as keyof Entity] ?? relationValue;
        }

        const resolvedValue = relationValue instanceof Promise
          ? relationValue.then(value => plainToInstance(relationDto, value || {}, { excludeExtraneousValues: true }))
          : plainToInstance(relationDto, relationValue || {}, { excludeExtraneousValues: true });

        acc[relation as keyof T] = resolvedValue as T[keyof T];
      }
      return acc;
    }, {} as Partial<T>);
  }
}
