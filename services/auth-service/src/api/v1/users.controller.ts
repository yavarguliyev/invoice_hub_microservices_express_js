import { JsonController, HttpCode, Post, Get, QueryParams, Authorized } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, Roles, ContainerItems } from '@invoice-hub/common';

import { IUserService } from 'application/services/user.service';

@JsonController(createVersionedRoute({ controllerPath: '/users', version: 'v1' }))
export class UsersController {
  private userService: IUserService;

  constructor () {
    this.userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
  }

  @Authorized([Roles.GlobalAdmin, Roles.Admin])
  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.userService.get(query);
  }

  @Authorized([Roles.Standard])
  @HttpCode(201)
  @Post('/create-order')
  async createOrder () {
    return await this.userService.createOrder();
  }
}
