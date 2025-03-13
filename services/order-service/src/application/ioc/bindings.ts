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
  GroupIds,
  DataLoaderInfrastructure,
  ContainerKeys
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';
import { IOrderService, OrderService } from 'application/services/order.service';
import { Order } from 'domain/entities/order.entity';
import { OrderRepository } from 'domain/repositories/order.repository';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureInfrastructures () {
  const kafka = new KafkaInfrastructure({ clientId: ClientIds.ORDER_SERVICE, groupId: GroupIds.ORDER_SERVICE_GROUP });
  await kafka.initialize();

  const redis = new RedisInfrastructure();
  await redis.initialize({ clientId: ClientIds.ORDER_SERVICE });

  const dbConnection = new DbConnectionInfrastructure();
  const dataSource = await dbConnection.create({ clientId: ClientIds.ORDER_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Order]) });
  await dataSource.initialize();

  const orderDataLoader = new DataLoaderInfrastructure<Order>(dataSource.getRepository(Order));

  Container.set(KafkaInfrastructure, kafka);
  Container.set(RedisInfrastructure, redis);
  Container.set(DbConnectionInfrastructure, dbConnection);
  Container.set(ContainerKeys.ORDER_DATA_LOADER, orderDataLoader);
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureLifecycleServices () {
  Container.set(GracefulShutdownHelper, new GracefulShutdownHelper());
}

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IOrderService, service: OrderService });

  const dbConnection = Container.get<DbConnectionInfrastructure>(DbConnectionInfrastructure);
  const dataSource = dbConnection.getDataSource({ clientId: ClientIds.ORDER_SERVICE });

  if (!dataSource) {
    throw new Error('Database connection is not initialized.');
  }

  Container.set(OrderRepository, dataSource.getRepository(Order));

  ContainerHelper
    .registerController(OrdersController);
};

export async function configureKafkaServices () {
  const orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);

  if (typeof orderService.initialize === 'function') {
    await orderService.initialize();
  }
};
