import { JsonController, Get, QueryParams, Authorized } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, Roles, ContainerItems } from '@invoice-hub/common';

import { IUserService } from 'application/services/user.service';

@Authorized([Roles.GlobalAdmin])
@JsonController(createVersionedRoute({ controllerPath: '/users', version: 'v1' }))
export class UsersController {
  private _userService: IUserService;

  private get userService (): IUserService {
    if (!this._userService) {
      this._userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
    }

    return this._userService;
  }

  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.userService.get(query);
  }
}
