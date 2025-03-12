import { Container } from 'typedi';
import { plainToInstance } from 'class-transformer';
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
  Subjects,
  GroupIds,
  EventPublisherDecorator,
  eventPublisherConfig
} from '@invoice-hub/common';

import { UserRepository } from 'domain/repositories/user.repository';

export interface IUserService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<UserDto>>;
  getBy (message: string): Promise<UserDto>;
}

export class UserService implements IUserService {
  private userRepository: UserRepository;
  private kafka: KafkaInfrastructure;

  constructor () {
    this.userRepository = Container.get(UserRepository);
    this.kafka = Container.get(KafkaInfrastructure);
  }

  async initialize () {
    await this.kafka.subscribe({
      topicName: Subjects.FETCH_USER_REQUEST, handler: this.getBy.bind(this), options: { groupId: GroupIds.AUTH_SERVICE_GROUP }
    });
  }

  @RedisDecorator<UserDto>(redisCacheConfig.USER_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({
      repository: this.userRepository,
      query,
      dtoClass: UserDto,
      relatedEntity: { RelatedDtoClass: RoleDto, relationField: 'role' }
    });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  @EventPublisherDecorator(eventPublisherConfig.USER_GET_BY)
  async getBy (message: string) {
    const { message: request } = JSON.parse(message);
    const { userId } = JSON.parse(request);

    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const userDto = plainToInstance(UserDto, user, { excludeExtraneousValues: true });
    userDto.role = plainToInstance(RoleDto, await user.role, { excludeExtraneousValues: true });

    return userDto;
  }
}
