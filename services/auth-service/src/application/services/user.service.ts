import { Container } from 'typedi';
import { KafkaInfrastructure, GetQueryResultsArgs, ResponseResults, queryResults, ResultMessage } from '@invoice-hub/common';

import { UserDto } from 'domain/dto/user.dto';
import { RoleDto } from 'domain/dto/role.dto';
import { UserRepository } from 'domain/repositories/user.repository';

export interface IUserService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<UserDto>>;
  createOrder (): Promise<ResponseResults<{ orderId: number }>>;
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

    return { payloads, total, result: ResultMessage.SUCCEED };
  }

  async initialize () {}

  async createOrder () {
    const orderId = Math.floor(Math.random() * 1000);
    const order = { totalAmount: 180.20 };

    await KafkaInfrastructure.publish('order-created', JSON.stringify({ orderId, order }));

    return { result: ResultMessage.SUCCEED, payload: { orderId } };
  }
}
