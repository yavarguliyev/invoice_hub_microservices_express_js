import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService, GlobalErrorHandlerMiddleware } from '@invoice-hub/common';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IAuthService, AuthService } from 'application/services/auth.service';
import { RoleService } from 'application/services/role.service';
import { IUserService, UserService } from 'application/services/user.service';
import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { DbConnectionInfrastructure } from 'infrastructure/db-connection.infrastructure';
import User from 'domain/entities/user.entity';
import { UserRepository } from 'domain/repositories/user.repository';
import Role from 'domain/entities/role.entity';
import { RoleRepository } from 'domain/repositories/role.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureRepositories () {
  const dataSource = await DbConnectionInfrastructure.create();
  await dataSource.initialize();

  Container.set(RoleRepository, dataSource.getRepository(Role));
  Container.set(UserRepository, dataSource.getRepository(User));
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
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
  const authService = ContainerHelper.get<IAuthService>(ContainerItems.IAuthService);
  const userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);

  await Promise.all([
    authService.initialize(),
    userService.initialize()
  ]);
};
