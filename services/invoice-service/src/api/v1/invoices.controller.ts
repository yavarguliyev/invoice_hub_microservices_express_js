import { JsonController, Get } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute } from '@invoice-hub/common-packages';

import { IInvoiceService } from 'application/services/invoice.service';
import { ContainerItems } from 'application/ioc/static/container-items';

@JsonController(createVersionedRoute({ controllerPath: '/invoices', version: 'v1' }))
export class InvoicesController {
  private invoiceService: IInvoiceService;

  constructor () {
    this.invoiceService = ContainerHelper.get<IInvoiceService>(ContainerItems.IInvoiceService);
  }

  @Get('/')
  async get () {
    return await this.invoiceService.get();
  }
}
