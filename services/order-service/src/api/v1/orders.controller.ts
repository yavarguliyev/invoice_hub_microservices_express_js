import { JsonController, Get, QueryParams, Authorized, Post, CurrentUser, Body, HttpCode, Params } from 'routing-controllers';
import { createVersionedRoute, GetQueryResultsArgs, Roles, UserDto, CreateOrderArgs, GetOrderArgs } from '@invoice-hub/common';

import { BaseController } from 'api/base.controller';

@Authorized([Roles.GlobalAdmin, Roles.Admin])
@JsonController(createVersionedRoute({ controllerPath: '/orders', version: 'v1' }))
export class OrdersController extends BaseController {
  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return this.orderService.get(query);
  }

  @Get('/:id')
  async getById (@Params() args: GetOrderArgs) {
    return this.orderService.getById(args);
  }

  @Authorized([Roles.Standard])
  @HttpCode(201)
  @Post('/')
  async createOrder (@CurrentUser() currentUser: UserDto, @Body() args: CreateOrderArgs) {
    return this.orderService.createOrder(currentUser, args);
  }
}
