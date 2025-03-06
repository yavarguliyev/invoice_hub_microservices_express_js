import { JsonController, Get, QueryParams, Authorized } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, ContainerItems, Roles } from '@invoice-hub/common';

import { IOrderService } from 'application/services/order.service';

@Authorized([Roles.GlobalAdmin, Roles.Contributor, Roles.Contributor, Roles.Contributor])
@JsonController(createVersionedRoute({ controllerPath: '/orders', version: 'v1' }))
export class OrdersController {
  private orderService: IOrderService;

  constructor () {
    this.orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  }

  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.orderService.get(query);
  }
}
