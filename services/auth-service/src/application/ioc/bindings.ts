import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import {
  ContainerHelper,
  registerService,
  GlobalErrorHandlerMiddleware,
  ContainerItems,
  ContainerKeys,
  DbConnectionInfrastructure,
  KafkaInfrastructure,
  getDataSourceConfig,
  ClientIds,
  RedisInfrastructure,
  GroupIds,
  DataLoaderInfrastructure,
  ExpressServerInfrastructure
} from '@invoice-hub/common';

import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
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

  const dbConnection = new DbConnectionInfrastructure();
  const dataSource = await dbConnection.create({ clientId: ClientIds.AUTH_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Role, User]) });
  await dataSource.initialize();

  const roleDataLoader = new DataLoaderInfrastructure<Role>(dataSource.getRepository(Role));
  const userDataLoader = new DataLoaderInfrastructure<User>(dataSource.getRepository(User));

  Container.set(KafkaInfrastructure, kafka);
  Container.set(RedisInfrastructure, redis);
  Container.set(DbConnectionInfrastructure, dbConnection);
  Container.set(ContainerKeys.USER_DATA_LOADER, userDataLoader);
  Container.set(ContainerKeys.ROLE_DATA_LOADER, roleDataLoader);
};

export function configureLifecycleServices () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
  Container.set(GracefulShutdownHelper, new GracefulShutdownHelper());
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
}

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IAuthService, service: AuthService });
  registerService({ id: ContainerItems.IRoleService, service: RoleService });
  registerService({ id: ContainerItems.IUserService, service: UserService });

  const dbConnection = Container.get<DbConnectionInfrastructure>(DbConnectionInfrastructure);
  const dataSource = dbConnection.getDataSource({ clientId: ClientIds.AUTH_SERVICE });

  if (!dataSource) {
    throw new Error('Database connection is not initialized.');
  }

  Container.set(RoleRepository, dataSource.getRepository(Role));
  Container.set(UserRepository, dataSource.getRepository(User));

  ContainerHelper
    .registerController(AuthController)
    .registerController(RolesController)
    .registerController(UsersController);
};

export async function configureKafkaServices () {
  const userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);

  if (typeof userService.initialize === 'function') {
    await userService.initialize();
  }
};
