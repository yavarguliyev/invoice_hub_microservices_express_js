import { Container } from 'typedi';
import { GetQueryResultsArgs, queryResults, ResponseResults, ResultMessage, RoleDto, RedisDecorator, REDIS_ROLE_LIST } from '@invoice-hub/common';

import { RoleRepository } from 'domain/repositories/role.repository';

export interface IRoleService {
  get(query: GetQueryResultsArgs): Promise<ResponseResults<RoleDto>>;
}

export class RoleService implements IRoleService {
  // #region DI
  private _roleRepository?: RoleRepository;

  private get roleRepository () {
    if (!this._roleRepository) {
      this._roleRepository = Container.get(RoleRepository);
    }

    return this._roleRepository;
  }
  // #endregion

  @RedisDecorator(REDIS_ROLE_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.roleRepository, query, dtoClass: RoleDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }
}
