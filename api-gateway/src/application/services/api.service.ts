import { ResponseResults, ResultMessage } from '@invoice-hub/common';

export interface IApiService {
  get(): Promise<ResponseResults<{ message: string }>>;
}

export class ApiService implements IApiService {
  async get () {
    return { payload: { message: 'API Gateway is working...' }, result: ResultMessage.SUCCESS };
  }
}
