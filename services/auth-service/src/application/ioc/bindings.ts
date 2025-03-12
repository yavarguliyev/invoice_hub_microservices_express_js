import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import {
  ContainerHelper,
  registerService,
  GlobalErrorHandlerMiddleware,
  ContainerItems,
  DbConnectionInfrastructure,
  KafkaInfrastructure,
  getDataSourceConfig,
  ClientIds,
  RedisInfrastructure,
  GroupIds
} from '@invoice-hub/common';

import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { AuthService } from 'application/services/auth.service';
import { RoleService } from 'application/services/role.service';
import { IUserService, UserService } from 'application/services/user.service';
import { Role } from 'domain/entities/role.entity';
import { User } from 'domain/entities/user.entity';
import { RoleRepository } from 'domain/repositories/role.repository';
import { UserRepository } from 'domain/repositories/user.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureInfrastructures () {
  const kafka = new KafkaInfrastructure({ clientId: ClientIds.AUTH_SERVICE, groupId: GroupIds.AUTH_SERVICE_GROUP });
  await kafka.initialize();

  const redis = new RedisInfrastructure();
  await redis.initialize({ clientId: ClientIds.AUTH_SERVICE });

  const db = new DbConnectionInfrastructure();
  const dataSource = await db.create({ clientId: ClientIds.AUTH_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Role, User]) });
  await dataSource.initialize();

  Container.set(KafkaInfrastructure, kafka);
  Container.set(RedisInfrastructure, redis);
  Container.set(DbConnectionInfrastructure, dataSource);

  Container.set(RoleRepository, dataSource.getRepository(Role));
  Container.set(UserRepository, dataSource.getRepository(User));
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IAuthService, service: AuthService });
  registerService({ id: ContainerItems.IRoleService, service: RoleService });
  registerService({ id: ContainerItems.IUserService, service: UserService });

  ContainerHelper
    .registerController(AuthController)
    .registerController(RolesController)
    .registerController(UsersController);
};

export async function configureKafkaServices () {
  const userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
  await userService.initialize();
};
