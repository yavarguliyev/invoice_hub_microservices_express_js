import { JsonController, Get, QueryParams, Authorized, Params } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, ContainerItems, Roles, GetInvoiceArgs } from '@invoice-hub/common';

import { IInvoiceService } from 'application/services/invoice.service';

@Authorized([Roles.GlobalAdmin, Roles.Contributor, Roles.Contributor, Roles.Contributor])
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

  @Get('/:id')
  async getById (@Params() args: GetInvoiceArgs) {
    return await this.invoiceService.getById(args);
  }
}
