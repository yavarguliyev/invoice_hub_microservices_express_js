import { JsonController, Get, QueryParams, Authorized } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, Roles, ContainerItems } from '@invoice-hub/common';

import { IUserService } from 'application/services/user.service';

@Authorized([Roles.GlobalAdmin])
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
}
