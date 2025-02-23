import { JsonController, Get } from 'routing-controllers';
import { createVersionedRoute } from '@invoice-hub/common-packages';

@JsonController(createVersionedRoute({ controllerPath: '/roles', version: 'v1' }))
export class RolesController {
  constructor () {}

  @Get('/')
  async get () {
    // KafkaInfrastructure.subscribe('roles-topic');

    return { message: 'Role service' };
  }
}
