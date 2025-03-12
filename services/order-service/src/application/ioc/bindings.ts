import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import {
  ContainerHelper,
  registerService,
  GlobalErrorHandlerMiddleware,
  ContainerItems,
  DbConnectionInfrastructure,
  getDataSourceConfig,
  KafkaInfrastructure,
  ClientIds,
  RedisInfrastructure,
  GroupIds
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';
import { IOrderService, OrderService } from 'application/services/order.service';
import { Order } from 'domain/entities/order.entity';
import { OrderRepository } from 'domain/repositories/order.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureInfrastructures () {
  const kafka = new KafkaInfrastructure({ clientId: ClientIds.ORDER_SERVICE, groupId: GroupIds.ORDER_SERVICE_GROUP });
  await kafka.initialize();

  const redis = new RedisInfrastructure();
  await redis.initialize({ clientId: ClientIds.ORDER_SERVICE });

  const db = new DbConnectionInfrastructure();
  const dataSource = await db.create({ clientId: ClientIds.ORDER_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Order]) });
  await dataSource.initialize();

  Container.set(KafkaInfrastructure, kafka);
  Container.set(RedisInfrastructure, redis);
  Container.set(DbConnectionInfrastructure, dataSource);
  Container.set(OrderRepository, dataSource.getRepository(Order));
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IOrderService, service: OrderService });

  ContainerHelper.registerController(OrdersController);
};

export async function configureKafkaServices () {
  const orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  await orderService.initialize();
};
