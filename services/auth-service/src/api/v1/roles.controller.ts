import { JsonController, Get, QueryParams, Authorized } from 'routing-controllers';
import { createVersionedRoute, GetQueryResultsArgs, Roles } from '@invoice-hub/common';

import { BaseController } from 'api/base.controller';

@Authorized([Roles.GlobalAdmin])
@JsonController(createVersionedRoute({ controllerPath: '/roles', version: 'v1' }))
export class RolesController extends BaseController {
  @Get('/')
  async get (@QueryParams() query: GetQueryResultsArgs) {
    return this.roleService.get(query);
  }
}
