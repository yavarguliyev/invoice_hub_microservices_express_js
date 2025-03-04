import { JsonController, Get, QueryParams } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs } from '@invoice-hub/common';

import { IInvoiceService } from 'application/services/invoice.service';
import { ContainerItems } from 'application/ioc/static/container-items';

@JsonController(createVersionedRoute({ controllerPath: '/invoices', version: 'v1' }))
export class InvoicesController {
  private invoiceService: IInvoiceService;

  constructor () {
    this.invoiceService = ContainerHelper.get<IInvoiceService>(ContainerItems.IInvoiceService);
  }

  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.invoiceService.get(query);
  }
}
