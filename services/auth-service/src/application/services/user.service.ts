import { Container } from 'typedi';
import {
  GetQueryResultsArgs, ResponseResults, queryResults, ResultMessage, UserDto, RoleDto
} from '@invoice-hub/common';

import { UserRepository } from 'domain/repositories/user.repository';

export interface IUserService {
  get (query: GetQueryResultsArgs): Promise<ResponseResults<UserDto>>;
}

export class UserService implements IUserService {
  private userRepository: UserRepository;

  constructor () {
    this.userRepository = Container.get(UserRepository);
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({
      repository: this.userRepository,
      query,
      dtoClass: UserDto,
      relatedEntity: {
        RelatedDtoClass: RoleDto,
        relationField: 'role'
      }
    });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }
}
