import { JsonController, Get, QueryParams, Authorized } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs, Roles, ContainerItems } from '@invoice-hub/common';

import { IRoleService } from 'application/services/role.service';

@Authorized([Roles.GlobalAdmin])
@JsonController(createVersionedRoute({ controllerPath: '/roles', version: 'v1' }))
export class RolesController {
  private roleService: IRoleService;

  constructor () {
    this.roleService = ContainerHelper.get<IRoleService>(ContainerItems.IRoleService);
  }

  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return await this.roleService.get(query);
  }
}
