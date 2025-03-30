import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  GetQueryResultsArgs,
  ResponseResults,
  queryResults,
  ResultMessage,
  UserDto,
  RoleDto,
  RedisDecorator,
  redisCacheConfig,
  KafkaInfrastructure,
  ContainerKeys,
  Subjects,
  GroupIds,
  EventPublisherDecorator,
  userEventPublisher,
  DataLoaderInfrastructure
} from '@invoice-hub/common';

import { UserRepository } from 'domain/repositories/user.repository';
import { User } from 'domain/entities/user.entity';

export interface IUserService {
  initialize(): Promise<void>;
  get(query: GetQueryResultsArgs): Promise<ResponseResults<UserDto>>;
}

export class UserService implements IUserService {
  private _userRepository?: UserRepository;
  private _kafka?: KafkaInfrastructure;
  private _userDtoLoaderById?: DataLoader<string, UserDto>;

  private get userRepository () {
    if (!this._userRepository) {
      this._userRepository = Container.get(UserRepository);
    }

    return this._userRepository;
  }

  private get kafka () {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }

    return this._kafka;
  }

  private get userDtoLoaderById () {
    if (!this._userDtoLoaderById) {
      this._userDtoLoaderById = Container.get<DataLoaderInfrastructure<User>>(ContainerKeys.USER_DATA_LOADER)
        .getDataLoader({ entity: User, Dto: UserDto, fetchField: 'id', relations: [{ relation: 'role', relationDto: RoleDto }] });
    }

    return this._userDtoLoaderById;
  }

  async initialize () {
    await this.kafka.subscribe({
      topicName: Subjects.FETCH_USER_REQUEST,
      handler: this.handleUserFetchRequest.bind(this),
      options: { groupId: GroupIds.AUTH_SERVICE_GROUP }
    });
  }

  @RedisDecorator(redisCacheConfig.USER_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({
      repository: this.userRepository, query, dtoClass: UserDto, relatedEntity: { RelatedDtoClass: RoleDto, relationField: 'role' }
    });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  private async handleUserFetchRequest (message: string): Promise<void> {
    await this.getBy(message);
  }

  @EventPublisherDecorator(userEventPublisher.USER_GET_BY)
  private async getBy (message: string) {
    const { message: request } = JSON.parse(message);
    const { userId: id } = JSON.parse(request);

    await this.userDtoLoaderById.clearAll();
    return this.userDtoLoaderById.load(id);
  }
}
