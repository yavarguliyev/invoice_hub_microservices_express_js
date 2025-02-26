import { JsonController, Get } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IOrderService } from 'application/services/order.service';

@JsonController(createVersionedRoute({ controllerPath: '/orders', version: 'v1' }))
export class OrdersController {
  private orderService: IOrderService;

  constructor () {
    this.orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  }

  @Get('/')
  async get () {
    return await this.orderService.get();
  }
}
