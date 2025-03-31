import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  EventPublisherDecorator,
  DataLoaderInfrastructure,
  ContainerKeys,
  userEventPublisher,
  UserDto,
  RoleDto
} from '@invoice-hub/common';

import { User } from 'domain/entities/user.entity';

export interface IUserKafkaSubscriber {
  initialize(): Promise<void>;
}

export class UserKafkaSubscriber implements IUserKafkaSubscriber {
  // #region DI
  private _kafka?: KafkaInfrastructure;
  private _userDtoLoaderById?: DataLoader<string, UserDto>;
  private isInitialized = false;

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
  // #endregion

  async initialize (): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const subscriptions = [
      { topic: Subjects.FETCH_USER_REQUEST, handler: this.handleFetchUserRequest }
    ];

    for (const { topic, handler } of subscriptions) {
      await this.kafka.subscribe({
        topicName: topic,
        handler: handler.bind(this),
        options: {
          groupId: GroupIds.AUTH_SERVICE_GROUP
        }
      });
    }

    this.isInitialized = true;
  }

  private async handleFetchUserRequest (message: string): Promise<void> {
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
