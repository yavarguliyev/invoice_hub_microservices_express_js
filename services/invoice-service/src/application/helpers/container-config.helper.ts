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

import { InvoicesController } from 'api/v1/invoices.controller';
import { InvoiceService } from 'application/services/invoice.service';
import { Invoice } from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { InvoiceKafkaSubscriber } from 'application/kafka/invoice-kafka.subscriber';
import { InvoiceTransactionManager } from 'application/transactions/invoice-transaction.manager';

class InvoiceAppConfig {
  static entities = [Invoice];

  private static repositories: { repository: Constructable<Repository<Invoice>>; entity: EntityTarget<IEntityWithId> }[] = [
    { repository: InvoiceRepository, entity: Invoice }
  ];

  private static dataLoaders: { containerKey: string; entity: EntityTarget<IEntityWithId> }[] = [
    { containerKey: ContainerKeys.INVOICE_DATA_LOADER, entity: Invoice }
  ];

  private static services: RegisterServiceOptions<InvoiceKafkaSubscriber | InvoiceTransactionManager | InvoiceService>[] = [
    { id: ContainerItems.IInvoiceKafkaSubscriber, service: InvoiceKafkaSubscriber } as RegisterServiceOptions<InvoiceKafkaSubscriber>,
    { id: ContainerItems.IInvoiceTransactionManager, service: InvoiceTransactionManager } as RegisterServiceOptions<InvoiceTransactionManager>,
    { id: ContainerItems.IInvoiceService, service: InvoiceService } as RegisterServiceOptions<InvoiceService>
  ];

  private static controllers: Constructable<InvoicesController>[] = [
    InvoicesController as Constructable<InvoicesController>
  ];

  private static dependencyInjectionsConfig = {
    useTypeOrm: true,
    clientId: ClientIds.INVOICE_SERVICE,
    groupId: GroupIds.INVOICE_SERVICE_GROUP,
    entities: InvoiceAppConfig.entities,
    controllers: InvoiceAppConfig.controllers,
    dataLoaders: InvoiceAppConfig.dataLoaders,
    repositories: InvoiceAppConfig.repositories,
    services: InvoiceAppConfig.services,
    serviceKeys: [ContainerItems.IInvoiceKafkaSubscriber, ContainerItems.IInvoiceTransactionManager, ContainerItems.IInvoiceService]
  };

  private static serverConfig = { clientId: ClientIds.INVOICE_SERVICE, controllers: InvoiceAppConfig.controllers };

  private static gracefulShutDownService: GracefulShutDownServiceConfig[] = [
    { name: 'Redis', disconnect: () => Container.get(RedisInfrastructure).disconnect({ clientId: ClientIds.INVOICE_SERVICE }) },
    { name: 'Kafka', disconnect: () => Container.get(KafkaInfrastructure).disconnect() },
    { name: 'Database', disconnect: () => Container.get(DbConnectionInfrastructure).disconnect({ clientId: ClientIds.INVOICE_SERVICE }) },
    { name: 'Transaction Coordinator', disconnect: () => Container.get(TransactionCoordinatorInfrastructure).disconnect({ clientId: ClientIds.INVOICE_SERVICE }) }
  ];

  static get config () {
    return {
      dependencyInjectionsConfig: InvoiceAppConfig.dependencyInjectionsConfig,
      serverConfig: InvoiceAppConfig.serverConfig,
      gracefulShutDownService: InvoiceAppConfig.gracefulShutDownService,
      appName: ClientIds.INVOICE_SERVICE
    };
  }
}

const entities = InvoiceAppConfig.entities;
const appConfig = InvoiceAppConfig.config;

export { entities, appConfig };
