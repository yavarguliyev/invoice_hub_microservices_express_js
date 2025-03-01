import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, ErrorHandlerMiddleware } from '@invoice-hub/common-packages';

import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { ApiGatewayController } from 'api/v1/api-gateway.controller';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureMiddlewares () {
  Container.set(ErrorHandlerMiddleware, new ErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  ContainerHelper
    .registerController(ApiGatewayController);
};
