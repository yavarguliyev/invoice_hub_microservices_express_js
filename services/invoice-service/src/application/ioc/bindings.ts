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
  ContainerKeys,
  ExpressServerInfrastructure
} from '@invoice-hub/common';

import { InvoicesController } from 'api/v1/invoices.controller';
import { IInvoiceService, InvoiceService } from 'application/services/invoice.service';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import { Invoice } from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureInfrastructures () {
  const kafka = new KafkaInfrastructure({ clientId: ClientIds.INVOICE_SERVICE, groupId: GroupIds.INVOICE_SERVICE_GROUP });
  await kafka.initialize();

  const redis = new RedisInfrastructure();
  await redis.initialize({ clientId: ClientIds.INVOICE_SERVICE });

  const dbConnection = new DbConnectionInfrastructure();
  const dataSource = await dbConnection.create({ clientId: ClientIds.INVOICE_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Invoice]) });
  await dataSource.initialize();

  const invoiceDataLoader = new DataLoaderInfrastructure<Invoice>(dataSource.getRepository(Invoice));

  Container.set(KafkaInfrastructure, kafka);
  Container.set(RedisInfrastructure, redis);
  Container.set(DbConnectionInfrastructure, dbConnection);
  Container.set(ContainerKeys.INVOICE_DATA_LOADER, invoiceDataLoader);
};

export function configureLifecycleServices () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
  Container.set(GracefulShutdownHelper, new GracefulShutdownHelper());
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
}

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IInvoiceService, service: InvoiceService });

  const dbConnection = Container.get<DbConnectionInfrastructure>(DbConnectionInfrastructure);
  const dataSource = dbConnection.getDataSource({ clientId: ClientIds.INVOICE_SERVICE });

  if (!dataSource) {
    throw new Error('Database connection is not initialized.');
  }

  Container.set(InvoiceRepository, dataSource.getRepository(Invoice));

  ContainerHelper
    .registerController(InvoicesController);
};

export async function configureKafkaServices () {
  const invoiceService = ContainerHelper.get<IInvoiceService>(ContainerItems.IInvoiceService);

  if (typeof invoiceService.initialize === 'function') {
    await invoiceService.initialize();
  }
};
