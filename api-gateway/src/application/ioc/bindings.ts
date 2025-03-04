import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, GlobalErrorHandlerMiddleware, registerService } from '@invoice-hub/common';

import { ApiService } from 'application/services/api.service';
import { ContainerItems } from 'application/ioc/static/container-items';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { ApiGatewayController } from 'api/v1/api-gateway.controller';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IApiService, service: ApiService });

  ContainerHelper
    .registerController(ApiGatewayController);
};
