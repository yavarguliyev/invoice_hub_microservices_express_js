import { JsonController, HttpCode, Post } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute } from '@invoice-hub/common-packages';

import { IUserService } from 'application/services/user.service';
import { ContainerItems } from 'application/ioc/static/container-items';

@JsonController(createVersionedRoute({ controllerPath: '/users', version: 'v1' }))
export class UsersController {
  private userService: IUserService;

  constructor () {
    this.userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
  }

  @HttpCode(201)
  @Post('/create-order')
  async createOrder () {
    return await this.userService.createOrder();
  }
}
