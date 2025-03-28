import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IApiService } from 'application/services/api.service';

export abstract class BaseController {
  private _apiService: IApiService;

  protected get apiService (): IApiService {
    if (!this._apiService) {
      this._apiService = ContainerHelper.get<IApiService>(ContainerItems.IApiService);
    }

    return this._apiService;
  }
}
