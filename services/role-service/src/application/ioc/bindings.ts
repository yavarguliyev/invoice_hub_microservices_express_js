import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { RoleService } from 'application/services/role.service';
import { RolesController } from 'api/v1/roles.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IRoleService, service: RoleService });

  ContainerHelper
    .registerController(RolesController);
};
