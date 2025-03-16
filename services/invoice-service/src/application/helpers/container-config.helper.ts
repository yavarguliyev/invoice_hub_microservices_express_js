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

import { InvoicesController } from 'api/v1/invoices.controller';
import { InvoiceService } from 'application/services/invoice.service';
import { Invoice } from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export const entities = [Invoice];

export const repositories: { repository: Constructable<Repository<Invoice>>; entity: EntityTarget<IEntityWithId> }[] = [
  { repository: InvoiceRepository, entity: Invoice }
];

export const dataLoaders: { containerKey: string, entity: EntityTarget<IEntityWithId> }[] = [
  { containerKey: ContainerKeys.INVOICE_DATA_LOADER, entity: Invoice }
];

export const services: RegisterServiceOptions<InvoiceService>[] = [
  { id: ContainerItems.IInvoiceService, service: InvoiceService } as RegisterServiceOptions<InvoiceService>
];

export const controllers: Constructable<InvoicesController>[] = [
  InvoicesController as Constructable<InvoicesController>
];

export const dependencyInjectionsConfig = {
  useTypeOrm: true,
  clientId: ClientIds.INVOICE_SERVICE,
  groupId: GroupIds.INVOICE_SERVICE_GROUP,
  entities,
  controllers,
  dataLoaders,
  repositories,
  services,
  serviceKeys: [ContainerItems.IInvoiceService]
};

export const serverConfig = { clientId: ClientIds.INVOICE_SERVICE, controllers };

export const gracefulShutDownService: GracefulShutDownServiceConfig[] = [
  { name: 'Redis', disconnect: () => Container.get(RedisInfrastructure).disconnect({ clientId: ClientIds.INVOICE_SERVICE }) },
  { name: 'Kafka', disconnect: () => Container.get(KafkaInfrastructure).disconnect() },
  { name: 'Database', disconnect: () => Container.get(DbConnectionInfrastructure).disconnect({ clientId: ClientIds.INVOICE_SERVICE }) }
];

export const appConfig = { dependencyInjectionsConfig, serverConfig, gracefulShutDownService, appName: ClientIds.INVOICE_SERVICE };
