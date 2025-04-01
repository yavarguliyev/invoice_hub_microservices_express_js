import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  EventPublisherDecorator,
  ContainerHelper,
  ContainerItems,
  ProcessType,
  ProcessStepStatus,
  OrderStatus,
  OrderDto,
  DataLoaderInfrastructure,
  ContainerKeys,
  BadRequestError,
  EVENT_PUBLISHER_OPERATION
} from '@invoice-hub/common';

import { IOrderTransactionManager } from 'application/transactions/order-transaction.manager';
import { Order } from 'domain/entities/order.entity';

export interface IOrderKafkaSubscriber {
  initialize(): Promise<void>;
}

export class OrderKafkaSubscriber implements IOrderKafkaSubscriber {
  // #region DI
  private _kafka?: KafkaInfrastructure;
  private _transactionManager?: IOrderTransactionManager;
  private _orderDtoLoaderById?: DataLoader<string, OrderDto>;
  private isInitialized = false;

  private get kafka () {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }

    return this._kafka;
  }

  private get transactionManager () {
    if (!this._transactionManager) {
      this._transactionManager = ContainerHelper.get<IOrderTransactionManager>(ContainerItems.IOrderTransactionManager);
    }

    return this._transactionManager;
  }

  private get orderDtoLoaderById () {
    if (!this._orderDtoLoaderById) {
      this._orderDtoLoaderById = Container.get<DataLoaderInfrastructure<Order>>(ContainerKeys.ORDER_DATA_LOADER)
        .getDataLoader({ entity: Order, Dto: OrderDto, fetchField: 'id' });
    }

    return this._orderDtoLoaderById;
  }
  // #endregion

  async initialize (): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const subscriptions = [
      { topic: Subjects.FETCH_ORDER_REQUEST, handler: this.handleFetchOrderRequest, options: { groupId: GroupIds.ORDER_USER_FETCH_GROUP } },
      { topic: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS, handler: this.handleUpdateOrderStatus, options: { groupId: GroupIds.ORDER_SERVICE_TRANSACTION_GROUP } }
    ];

    for (const { topic, handler, options } of subscriptions) {
      await this.kafka.subscribe({ topicName: topic, handler: handler.bind(this), options });
    }

    this.isInitialized = true;
  }

  private async handleFetchOrderRequest (message: string): Promise<void> {
    await this.getBy(message);
  }

  private async handleUpdateOrderStatus (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, orderId, failureReason, finalStatus } = message;

    if (failureReason) {
      if (finalStatus) {
        await this.transactionManager.updateOrderStatus(orderId, transactionId, finalStatus);
      }

      throw new BadRequestError(failureReason);
    }

    await this.transactionManager.updateOrderStatus(orderId, transactionId, OrderStatus.COMPLETED);
    this.handleUpdateOrderStatusPublisher(transactionId, orderId);
  }

  @EventPublisherDecorator(EVENT_PUBLISHER_OPERATION)
  private async getBy (message: string) {
    const { correlationId, message: request } = JSON.parse(message);
    const { orderId: id } = JSON.parse(request);

    return {
      topicName: Subjects.FETCH_ORDER_RESPONSE,
      message: {
        correlationId,
        message: await this.orderDtoLoaderById.load(id)
      }
    };
  }

  @EventPublisherDecorator(EVENT_PUBLISHER_OPERATION)
  private handleUpdateOrderStatusPublisher (transactionId: string, orderId: string) {
    return {
      topicName: Subjects.TRANSACTION_STEP_COMPLETED,
      message: {
        transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.COMPLETED,
        payload: {
          orderId,
          orderStatus: OrderStatus.COMPLETED
        }
      }
    };
  }
}
