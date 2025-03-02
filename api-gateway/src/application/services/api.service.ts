export interface IApiService {
  get (): Promise<any>;
}

export class ApiService implements IApiService {
  constructor () {}

  async get () {
    return { message: 'API Gateway is working...' };
  }
}
