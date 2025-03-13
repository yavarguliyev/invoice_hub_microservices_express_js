import { EntityTarget } from 'typeorm';

import { IEntityWithId } from '../../core/types/db-results.type';

export interface IRelationParams<T> {
  relation: keyof T & string;
  relationDto: new () => T[keyof T];
}

export interface IEntityDataLoaderParams<Entity extends IEntityWithId, D> {
  entity: EntityTarget<Entity>;
  relations?: IRelationParams<D>[];
  Dto: new () => D;
  fetchField?: keyof Entity;
}
