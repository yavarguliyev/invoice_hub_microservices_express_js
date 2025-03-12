import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, GlobalErrorHandlerMiddleware, registerService, ContainerItems } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';
import { ApiService } from 'application/services/api.service';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IApiService, service: ApiService });
  ContainerHelper.registerController(ApiGatewayController);
};
