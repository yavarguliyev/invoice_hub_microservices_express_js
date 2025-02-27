import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IAuthService, AuthService } from 'application/services/auth.service';
import { RoleService } from 'application/services/role.service';
import { UserService } from 'application/services/user.service';
import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
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

export function configureKafkaServices () {
  const authService = ContainerHelper.get<IAuthService>(ContainerItems.IAuthService);
  authService.initialize();
};
