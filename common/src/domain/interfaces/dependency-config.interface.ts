import { Constructable } from 'typedi';
import { EntitySchema, EntityTarget, Repository, ObjectLiteral } from 'typeorm';
import http from 'http';

import { IEntityWithId } from '../../core/types/db-results.type';
import { ClientIds, GroupIds } from '../../domain/enums/events.enum';
import { RegisterServiceOptions } from '../../domain/interfaces/utility-functions-options.interface';

export interface DependencyConfig<T, U, Z extends ObjectLiteral> {
  useTypeOrm: boolean;
  clientId: ClientIds;
  groupId: GroupIds;
  entities: (string | Function | EntitySchema)[];
  dataLoaders: { containerKey: string; entity: EntityTarget<IEntityWithId> }[];
  services: RegisterServiceOptions<T>[];
  repositories: { repository: Constructable<Repository<Z>>; entity: EntityTarget<IEntityWithId> }[];
  controllers: Constructable<U>[];
  serviceKeys: string[];
}

export interface ServerConfig<T> {
  clientId: ClientIds;
  controllers: Constructable<T>[];
  proxies?: { path: string; target: string }[];
}

export interface StartServerConfig {
  httpServer: http.Server;
  port: number;
  appName: string;
}

export interface GracefulShutDownServiceConfig {
  name: string;
  disconnect: () => Promise<void>;
}

export interface AppConfig<T, U, Z extends ObjectLiteral> {
  dependencyInjectionsConfig: DependencyConfig<T, U, Z>;
  serverConfig: ServerConfig<U>;
  appName: ClientIds;
  gracefulShutDownService: GracefulShutDownServiceConfig[];
}
