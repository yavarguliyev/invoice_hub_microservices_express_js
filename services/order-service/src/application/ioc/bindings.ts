import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import {
  ContainerHelper, registerService, GlobalErrorHandlerMiddleware, ContainerItems, DbConnectionInfrastructure, getDataSourceConfig, ServicesName
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';
import { OrderService } from 'application/services/order.service';
import { Order } from 'domain/entities/order.entity';
import { OrderRepository } from 'domain/repositories/order.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureRepositories () {
  const dataSource = DbConnectionInfrastructure.create({ serviceName: ServicesName.ORDER_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Order]) });
  await dataSource.initialize();

  Container.set(OrderRepository, dataSource.getRepository(Order));
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IOrderService, service: OrderService });

  ContainerHelper
    .registerController(OrdersController);
};
