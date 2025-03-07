import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import {
  ContainerHelper, registerService, GlobalErrorHandlerMiddleware, ContainerItems, DbConnectionInfrastructure, getDataSourceConfig, ServicesName
} from '@invoice-hub/common';

import { InvoicesController } from 'api/v1/invoices.controller';
import { IInvoiceService, InvoiceService } from 'application/services/invoice.service';
import { Invoice } from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureRepositories () {
  const dataSource = DbConnectionInfrastructure.create({ serviceName: ServicesName.INVOICE_SERVICE, dataSourceOptions: getDataSourceConfig(false, [Invoice]) });
  await dataSource.initialize();

  Container.set(InvoiceRepository, dataSource.getRepository(Invoice));
};

export function configureMiddlewares () {
  Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
};

export function configureControllersAndServices () {
  registerService({ id: ContainerItems.IInvoiceService, service: InvoiceService });

  ContainerHelper
    .registerController(InvoicesController);
};

export async function configureKafkaServices () {
  const invoiceService = ContainerHelper.get<IInvoiceService>(ContainerItems.IInvoiceService);
  await invoiceService.initialize();
};
