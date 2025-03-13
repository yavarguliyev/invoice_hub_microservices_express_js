import { Get, JsonController } from 'routing-controllers';
import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IApiService } from 'application/services/api.service';

@JsonController('/')
export class ApiGatewayController {
  private _apiService: IApiService;

  private get apiService (): IApiService {
    if (!this._apiService) {
      this._apiService = ContainerHelper.get<IApiService>(ContainerItems.IApiService);
    }

    return this._apiService;
  }

  @Get('/')
  async get () {
    return await this.apiService.get();
  }
}
