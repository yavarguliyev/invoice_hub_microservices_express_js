import { Container } from 'typedi';
import {
  KafkaInfrastructure, GetQueryResultsArgs, ResponseResults, queryResults, ResultMessage, UserDto, RoleDto, Subjects
} from '@invoice-hub/common';

import { UserRepository } from 'domain/repositories/user.repository';

export interface IUserService {
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

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async createOrder () {
    const orderId = Math.floor(Math.random() * 1000);
    const order = { totalAmount: 180.20 };

    await KafkaInfrastructure.publish(Subjects.ORDER_CREATED, JSON.stringify({ orderId, order }));

    return { result: ResultMessage.SUCCESS, payload: { orderId } };
  }
}
