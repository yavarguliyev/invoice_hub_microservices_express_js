import { JsonController, Get } from 'routing-controllers';
import { createVersionedRoute } from '@invoice-hub/common-packages';

@JsonController(createVersionedRoute({ controllerPath: '/users', version: 'v1' }))
export class UsersController {
  constructor () {}

  @Get('/')
  async get () {
    // KafkaInfrastructure.subscribe('users-topic');

    return { message: 'User service' };
  }
}
