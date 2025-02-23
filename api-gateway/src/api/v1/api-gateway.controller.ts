import { Get } from 'routing-controllers';

export class ApiGatewayController {
  @Get('/')
  async get () {
    return { message: 'API Gateway is working...' };
  }
}
