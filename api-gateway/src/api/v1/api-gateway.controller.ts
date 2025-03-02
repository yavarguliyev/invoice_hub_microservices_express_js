import { Get, JsonController } from 'routing-controllers';
import { ContainerHelper } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IApiService } from 'application/services/api.service';

@JsonController('/')
export class ApiGatewayController {
  private apiService: IApiService;

  constructor () {
    this.apiService = ContainerHelper.get<IApiService>(ContainerItems.IApiService);
  }

  @Get('/')
  async get () {
    return await this.apiService.get();
  }
}
