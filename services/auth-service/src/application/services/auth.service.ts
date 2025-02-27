export interface IAuthService {
  initialize (): Promise<void>;
  get (): Promise<any>;
  signin (): Promise<any>;
  signup (): Promise<any>;
}

export class AuthService implements IAuthService {
  async initialize () {}

  async get () {
    return { result: 'SUCCEED' };
  }

  async signin () {
    return { result: 'SUCCEED' };
  }

  async signup () {
    return { result: 'SUCCEED' };
  }
}
