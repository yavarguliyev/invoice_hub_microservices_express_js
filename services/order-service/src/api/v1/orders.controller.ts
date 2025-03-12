import { JsonController, Get, QueryParams, Authorized, Post, CurrentUser, Body, HttpCode, Patch, Param, Params } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, ContainerItems, Roles, UserDto, CreateOrderArgs, GetOrderArgs } from '@invoice-hub/common';

import { IOrderService } from 'application/services/order.service';

@JsonController(createVersionedRoute({ controllerPath: '/orders', version: 'v1' }))
export class OrdersController {
  private orderService: IOrderService;

  constructor () {
    this.orderService = ContainerHelper.get<IOrderService>(ContainerItems.IOrderService);
  }

  @Authorized([Roles.GlobalAdmin, Roles.Admin])
  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.orderService.get(query);
  }

  @Get('/:id')
  async getById (@Params() args: GetOrderArgs) {
    return await this.orderService.getById(args);
  }

  @Authorized([Roles.Standard])
  @HttpCode(201)
  @Post('/')
  async createOrder (@CurrentUser() currentUser: UserDto, @Body() args: CreateOrderArgs) {
    return await this.orderService.createOrder(currentUser, args);
  }

  @Authorized([Roles.GlobalAdmin, Roles.Admin])
  @Patch('/:id/approve')
  async approveOrder (@Param('id') orderId: string) {
    return await this.orderService.approveOrder(orderId);
  }

  @Authorized([Roles.GlobalAdmin, Roles.Admin])
  @Patch('/:id/cancel')
  async cancelOrder (@Param('id') orderId: string) {
    return await this.orderService.cancelOrder(orderId);
  }
}
