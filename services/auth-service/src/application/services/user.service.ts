import { Container } from 'typedi';
import {
  GetQueryResultsArgs,
  ResponseResults,
  queryResults,
  ResultMessage,
  UserDto,
  RoleDto,
  RedisDecorator,
  redisCacheConfig,
  ContainerHelper,
  ContainerItems
} from '@invoice-hub/common';

import { UserRepository } from 'domain/repositories/user.repository';
import { IUserKafkaSubscriber } from 'application/kafka/user-kafka.subscriber';

export interface IUserService {
  initialize(): Promise<void>;
  get(query: GetQueryResultsArgs): Promise<ResponseResults<UserDto>>;
}

export class UserService implements IUserService {
  // #region DI
  private _userRepository?: UserRepository;
  private _kafkaSubscriber?: IUserKafkaSubscriber;

  private get userRepository () {
    if (!this._userRepository) {
      this._userRepository = Container.get(UserRepository);
    }

    return this._userRepository;
  }

  private get kafkaSubscriber () {
    if (!this._kafkaSubscriber) {
      this._kafkaSubscriber = ContainerHelper.get<IUserKafkaSubscriber>(ContainerItems.IUserKafkaSubscriber);
    }

    return this._kafkaSubscriber;
  }
  // #endregion

  async initialize () {
    await this.kafkaSubscriber.initialize();
  }

  @RedisDecorator(redisCacheConfig.USER_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({
      repository: this.userRepository, query, dtoClass: UserDto, relatedEntity: { RelatedDtoClass: RoleDto, relationField: 'role' }
    });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }
}
