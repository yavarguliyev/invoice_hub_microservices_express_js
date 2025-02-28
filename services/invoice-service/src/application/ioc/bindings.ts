import { Container } from 'typedi';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import { ContainerHelper, registerService } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IInvoiceService, InvoiceService } from 'application/services/invoice.service';
import { InvoicesController } from 'api/v1/invoices.controller';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

export function configureContainers () {
  routingControllersUseContainer(Container);
};

export function configureInfrastructures () {
  Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
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
