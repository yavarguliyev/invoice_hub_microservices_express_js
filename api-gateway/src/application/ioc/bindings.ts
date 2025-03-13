import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, GlobalErrorHandlerMiddleware, registerService, ContainerItems, ExpressServerInfrastructure } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import { ApiService } from 'application/services/api.service';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureLifecycleServices () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
  Container.set(GracefulShutdownHelper, new GracefulShutdownHelper());
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
}

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IApiService, service: ApiService });

  ContainerHelper
    .registerController(ApiGatewayController);
};
