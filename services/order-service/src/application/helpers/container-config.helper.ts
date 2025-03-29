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
  RegisterServiceOptions,
  TransactionCoordinatorInfrastructure
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';
import { OrderTransactionManager } from 'application/transactions/order-transaction.manager';
import { OrderKafkaSubscriber } from 'application/kafka/order-kafka.subscriber';
import { OrderService } from 'application/services/order.service';
import { Order } from 'domain/entities/order.entity';
import { OrderRepository } from 'domain/repositories/order.repository';

class OrderAppConfig {
  static entities = [Order];

  private static repositories: { repository: Constructable<Repository<Order>>; entity: EntityTarget<IEntityWithId> }[] = [
    { repository: OrderRepository, entity: Order }
  ];

  private static dataLoaders: { containerKey: string; entity: EntityTarget<IEntityWithId> }[] = [
    { containerKey: ContainerKeys.ORDER_DATA_LOADER, entity: Order }
  ];

  private static services: RegisterServiceOptions<OrderTransactionManager | OrderKafkaSubscriber | OrderService>[] = [
    { id: ContainerItems.IOrderTransactionManager, service: OrderTransactionManager } as RegisterServiceOptions<OrderTransactionManager>,
    { id: ContainerItems.IOrderKafkaSubscriber, service: OrderKafkaSubscriber } as RegisterServiceOptions<OrderKafkaSubscriber>,
    { id: ContainerItems.IOrderService, service: OrderService } as RegisterServiceOptions<OrderService>
  ];

  private static controllers: Constructable<OrdersController>[] = [
    OrdersController as Constructable<OrdersController>
  ];

  private static dependencyInjectionsConfig = {
    useTypeOrm: true,
    clientId: ClientIds.ORDER_SERVICE,
    groupId: GroupIds.ORDER_SERVICE_GROUP,
    entities: OrderAppConfig.entities,
    controllers: OrderAppConfig.controllers,
    dataLoaders: OrderAppConfig.dataLoaders,
    repositories: OrderAppConfig.repositories,
    services: OrderAppConfig.services,
    serviceKeys: [ContainerItems.IOrderTransactionManager, ContainerItems.IOrderKafkaSubscriber, ContainerItems.IOrderService]
  };

  private static serverConfig = { clientId: ClientIds.ORDER_SERVICE, controllers: OrderAppConfig.controllers };

  private static gracefulShutDownService: GracefulShutDownServiceConfig[] = [
    { name: 'Redis', disconnect: () => Container.get(RedisInfrastructure).disconnect({ clientId: ClientIds.ORDER_SERVICE }) },
    { name: 'Kafka', disconnect: () => Container.get(KafkaInfrastructure).disconnect() },
    { name: 'Database', disconnect: () => Container.get(DbConnectionInfrastructure).disconnect({ clientId: ClientIds.ORDER_SERVICE }) },
    { name: 'Transaction Coordinator', disconnect: () => Container.get(TransactionCoordinatorInfrastructure).disconnect({ clientId: ClientIds.ORDER_SERVICE }) }
  ];

  static get config () {
    return {
      dependencyInjectionsConfig: OrderAppConfig.dependencyInjectionsConfig,
      serverConfig: OrderAppConfig.serverConfig,
      gracefulShutDownService: OrderAppConfig.gracefulShutDownService,
      appName: ClientIds.ORDER_SERVICE
    };
  }
}

const entities = OrderAppConfig.entities;
const appConfig = OrderAppConfig.config;

export { entities, appConfig };
