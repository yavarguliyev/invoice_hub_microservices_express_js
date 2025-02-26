export interface IRoleService {
  get (): Promise<any>;
}

export class RoleService implements IRoleService {
  constructor () {}

  async get () {
    return { result: 'SUCCEED' };
  }
}
