import { Get, JsonController } from 'routing-controllers';

@JsonController()
export class ApiGatewayController {
  @Get('/')
  async get () {
    return { message: 'API Gateway is working...' };
  }
}
