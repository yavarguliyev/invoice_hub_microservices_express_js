import { Container } from 'typedi';
import { useContainer as typeormUseContainer } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, GlobalErrorHandlerMiddleware, registerService } from '@invoice-hub/common';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IInvoiceService, InvoiceService } from 'application/services/invoice.service';
import { InvoicesController } from 'api/v1/invoices.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { DbConnectionInfrastructure } from 'infrastructure/db-connection.infrastructure';
import Invoice from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export function configureContainers () {
  typeormUseContainer(Container);
  routingControllersUseContainer(Container);
};

export async function configureRepositories () {
  const dataSource = await DbConnectionInfrastructure.create();
  await dataSource.initialize();

  Container.set(InvoiceRepository, dataSource.getRepository(Invoice));
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
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
