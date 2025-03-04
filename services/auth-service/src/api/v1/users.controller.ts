import { JsonController, HttpCode, Post, Get, QueryParams } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs } from '@invoice-hub/common';

import { IUserService } from 'application/services/user.service';
import { ContainerItems } from 'application/ioc/static/container-items';

@JsonController(createVersionedRoute({ controllerPath: '/users', version: 'v1' }))
export class UsersController {
  private userService: IUserService;

  constructor () {
    this.userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
  }

  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.userService.get(query);
  }

  @HttpCode(201)
  @Post('/create-order')
  async createOrder () {
    return await this.userService.createOrder();
  }
}
