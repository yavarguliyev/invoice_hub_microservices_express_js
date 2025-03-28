import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IOrderService } from 'application/services/order.service';

export abstract class BaseController {
  private _orderService: IOrderService;

  protected get orderService (): IOrderService {
    if (!this._orderService) {
      this._orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
    }

    return this._orderService;
  }
}
