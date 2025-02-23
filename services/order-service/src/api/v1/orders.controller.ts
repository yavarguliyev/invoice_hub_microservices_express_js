import { JsonController, Get } from 'routing-controllers';
import { createVersionedRoute } from '@invoice-hub/common-packages';

@JsonController(createVersionedRoute({ controllerPath: '/orders', version: 'v1' }))
export class OrdersController {
  constructor () {}

  @Get('/')
  async get () {
    // KafkaInfrastructure.subscribe('orders-topic');

    return { message: 'Order service' };
  }
}
