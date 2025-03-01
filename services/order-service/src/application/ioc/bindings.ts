import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, ErrorHandlerMiddleware, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IOrderService, OrderService } from 'application/services/order.service';
import { OrdersController } from 'api/v1/orders.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { DbConnectionInfrastructure } from 'infrastructure/db-connection.infrastructure';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureRepositories () {
  const dataSource = await DbConnectionInfrastructure.create();
  await dataSource.initialize();
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureMiddlewares () {
  Container.set(ErrorHandlerMiddleware, new ErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IOrderService, service: OrderService });

  ContainerHelper
    .registerController(OrdersController);
};

export async function configureKafkaServices () {
  const orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  await orderService.initialize();
};
