import { Container } from 'typedi';
import { GetQueryResultsArgs, queryResults, ResponseResults, ResultMessage } from '@invoice-hub/common';

import { RoleDto } from 'domain/dto/role.dto';
import { RoleRepository } from 'domain/repositories/role.repository';

export interface IRoleService {
  get (query: GetQueryResultsArgs): Promise<ResponseResults<RoleDto>>;
}

export class RoleService implements IRoleService {
  private roleRepository: RoleRepository;

  constructor () {
    this.roleRepository = Container.get(RoleRepository);
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.roleRepository, query, dtoClass: RoleDto });

    return { payloads, total, result: ResultMessage.SUCCEED };
  }
}
