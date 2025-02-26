import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IOrderService, OrderService } from 'application/services/order.service';
import { OrdersController } from 'api/v1/orders.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IOrderService, service: OrderService });

  ContainerHelper
    .registerController(OrdersController);
};

export function configureKafkaServices () {
  const orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  orderService.initialize();
};
