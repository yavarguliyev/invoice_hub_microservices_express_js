import { Get, JsonController } from 'routing-controllers';
import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

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
