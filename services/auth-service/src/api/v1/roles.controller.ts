import { JsonController, Get } from 'routing-controllers';
import { ContainerHelper, createVersionedRoute } from '@invoice-hub/common-packages';

import { IRoleService } from 'application/services/role.service';
import { ContainerItems } from 'application/ioc/static/container-items';

@JsonController(createVersionedRoute({ controllerPath: '/roles', version: 'v1' }))
export class RolesController {
  private roleService: IRoleService;

  constructor () {
    this.roleService = ContainerHelper.get<IRoleService>(ContainerItems.IRoleService);
  }

  @Get('/')
  async get () {
    return await this.roleService.get();
  }
}
