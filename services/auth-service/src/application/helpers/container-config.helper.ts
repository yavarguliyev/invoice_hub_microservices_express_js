import { Container, Constructable } from 'typedi';
import { EntityTarget, Repository } from 'typeorm';
import {
  ClientIds,
  ContainerItems,
  ContainerKeys,
  DbConnectionInfrastructure,
  GracefulShutDownServiceConfig,
  GroupIds,
  IEntityWithId,
  KafkaInfrastructure,
  RedisInfrastructure,
  RegisterServiceOptions,
  TransactionCoordinatorInfrastructure
} from '@invoice-hub/common';

import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { AuthService } from 'application/services/auth.service';
import { RoleService } from 'application/services/role.service';
import { UserService } from 'application/services/user.service';
import { Role } from 'domain/entities/role.entity';
import { User } from 'domain/entities/user.entity';
import { RoleRepository } from 'domain/repositories/role.repository';
import { UserRepository } from 'domain/repositories/user.repository';

class AppConfig {
  static entities = [Role, User];

  private static repositories: { repository: Constructable<Repository<Role | User>>; entity: EntityTarget<IEntityWithId> }[] = [
    { repository: RoleRepository, entity: Role },
    { repository: UserRepository, entity: User }
  ];

  private static dataLoaders: { containerKey: string; entity: EntityTarget<IEntityWithId> }[] = [
    { containerKey: ContainerKeys.ROLE_DATA_LOADER.toString(), entity: Role },
    { containerKey: ContainerKeys.USER_DATA_LOADER, entity: User }
  ];

  private static services: RegisterServiceOptions<AuthService | RoleService | UserService>[] = [
    { id: ContainerItems.IAuthService, service: AuthService } as RegisterServiceOptions<AuthService>,
    { id: ContainerItems.IRoleService, service: RoleService } as RegisterServiceOptions<RoleService>,
    { id: ContainerItems.IUserService, service: UserService } as RegisterServiceOptions<UserService>
  ];

  private static controllers: Constructable<AuthController | RolesController | UsersController>[] = [
    AuthController as Constructable<AuthController>,
    RolesController as Constructable<RolesController>,
    UsersController as Constructable<UsersController>
  ];

  private static dependencyInjectionsConfig = {
    useTypeOrm: true,
    clientId: ClientIds.AUTH_SERVICE,
    groupId: GroupIds.AUTH_SERVICE_GROUP,
    entities: AppConfig.entities,
    controllers: AppConfig.controllers,
    dataLoaders: AppConfig.dataLoaders,
    repositories: AppConfig.repositories,
    services: AppConfig.services,
    serviceKeys: [ContainerItems.IUserService]
  };

  private static serverConfig = { clientId: ClientIds.AUTH_SERVICE, controllers: AppConfig.controllers };

  private static gracefulShutDownService: GracefulShutDownServiceConfig[] = [
    { name: 'Redis', disconnect: () => Container.get(RedisInfrastructure).disconnect({ clientId: ClientIds.AUTH_SERVICE }) },
    { name: 'Kafka', disconnect: () => Container.get(KafkaInfrastructure).disconnect() },
    { name: 'Database', disconnect: () => Container.get(DbConnectionInfrastructure).disconnect({ clientId: ClientIds.AUTH_SERVICE }) },
    { name: 'Transaction Coordinator', disconnect: () => Container.get(TransactionCoordinatorInfrastructure).disconnect({ clientId: ClientIds.AUTH_SERVICE }) }
  ];

  static get config () {
    return {
      dependencyInjectionsConfig: AppConfig.dependencyInjectionsConfig,
      serverConfig: AppConfig.serverConfig,
      gracefulShutDownService: AppConfig.gracefulShutDownService,
      appName: ClientIds.AUTH_SERVICE
    };
  }
}

const entities = AppConfig.entities;
const appConfig = AppConfig.config;

export { entities, appConfig };
