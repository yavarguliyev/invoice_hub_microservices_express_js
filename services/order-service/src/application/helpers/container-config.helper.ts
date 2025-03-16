import { Container, Constructable } from 'typedi';
import { EntityTarget, Repository } from 'typeorm';
import {
  ClientIds,
  ContainerItems,
  ContainerKeys,
  DbConnectionInfrastructure,
  GracefulShutDownServiceConfig,
  GroupIds,
  IEntityWithId,
  KafkaInfrastructure,
  RedisInfrastructure,
  RegisterServiceOptions
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';
import { OrderService } from 'application/services/order.service';
import { Order } from 'domain/entities/order.entity';
import { OrderRepository } from 'domain/repositories/order.repository';

export const entities = [Order];

export const repositories: { repository: Constructable<Repository<Order>>; entity: EntityTarget<IEntityWithId> }[] = [
  { repository: OrderRepository, entity: Order }
];

export const dataLoaders: { containerKey: string, entity: EntityTarget<IEntityWithId> }[] = [
  { containerKey: ContainerKeys.ORDER_DATA_LOADER, entity: Order }
];

export const services: RegisterServiceOptions<OrderService>[] = [
  { id: ContainerItems.IOrderService, service: OrderService } as RegisterServiceOptions<OrderService>
];

export const controllers: Constructable<OrdersController>[] = [
  OrdersController as Constructable<OrdersController>
];

export const dependencyInjectionsConfig = {
  useTypeOrm: true,
  clientId: ClientIds.ORDER_SERVICE,
  groupId: GroupIds.ORDER_SERVICE_GROUP,
  entities,
  controllers,
  dataLoaders,
  repositories,
  services,
  serviceKeys: [ContainerItems.IOrderService]
};

export const serverConfig = { clientId: ClientIds.ORDER_SERVICE, controllers };

export const gracefulShutDownService: GracefulShutDownServiceConfig[] = [
  { name: 'Redis', disconnect: () => Container.get(RedisInfrastructure).disconnect({ clientId: ClientIds.ORDER_SERVICE }) },
  { name: 'Kafka', disconnect: () => Container.get(KafkaInfrastructure).disconnect() },
  { name: 'Database', disconnect: () => Container.get(DbConnectionInfrastructure).disconnect({ clientId: ClientIds.ORDER_SERVICE }) }
];

export const appConfig = { dependencyInjectionsConfig, serverConfig, gracefulShutDownService, appName: ClientIds.ORDER_SERVICE };
