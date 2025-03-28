import { JsonController, Get, QueryParams, Authorized, Params } from 'routing-controllers';
import { createVersionedRoute, GetQueryResultsArgs, Roles, GetInvoiceArgs } from '@invoice-hub/common';

import { BaseController } from 'api/base.controller';

@Authorized([Roles.GlobalAdmin, Roles.Contributor, Roles.Contributor])
@JsonController(createVersionedRoute({ controllerPath: '/invoices', version: 'v1' }))
export class InvoicesController extends BaseController {
  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return this.invoiceService.get(query);
  }

  @Get('/:id')
  async getById (@Params() args: GetInvoiceArgs) {
    return this.invoiceService.getById(args);
  }
}
