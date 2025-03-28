import { Get, JsonController } from 'routing-controllers';

import { BaseController } from 'api/base.controller';

@JsonController('/')
export class ApiGatewayController extends BaseController {
  @Get('/')
  async get () {
    return await this.apiService.get();
  }
}
