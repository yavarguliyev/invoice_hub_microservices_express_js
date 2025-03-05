import { JsonController, Get, QueryParams } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, ContainerItems } from '@invoice-hub/common';

import { IInvoiceService } from 'application/services/invoice.service';

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
