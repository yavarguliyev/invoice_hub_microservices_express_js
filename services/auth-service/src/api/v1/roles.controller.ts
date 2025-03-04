import { JsonController, Get, QueryParams } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute, GetQueryResultsArgs } from '@invoice-hub/common';

import { IRoleService } from 'application/services/role.service';
import { ContainerItems } from 'application/ioc/static/container-items';

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
