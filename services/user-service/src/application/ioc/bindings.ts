import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { UserService } from 'application/services/user.service';
import { UsersController } from 'api/v1/users.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IUserService, service: UserService });

  ContainerHelper
    .registerController(UsersController);
};
