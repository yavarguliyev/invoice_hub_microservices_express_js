import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  LoggerTracerInfrastructure,
  EventPublisherDecorator,
  ContainerHelper,
  ContainerItems,
  ProcessType,
  ProcessStepStatus,
  OrderStatus,
  KafkaRequestOptions,
  transactionEventPublisher,
  orderEventPublisher,
  OrderDto,
  DataLoaderInfrastructure,
  ContainerKeys,
  BadRequestError
} from '@invoice-hub/common';

import { IOrderTransactionManager } from 'application/transactions/order-transaction.manager';
import { Order } from 'domain/entities/order.entity';

export interface IOrderKafkaSubscriber {
  initialize(): Promise<void>;
  requestUserData(options: KafkaRequestOptions[]): Promise<string[]>;
}

export class OrderKafkaSubscriber implements IOrderKafkaSubscriber {
  // #region DI
  private _kafka?: KafkaInfrastructure;
  private _transactionManager?: IOrderTransactionManager;
  private _orderDtoLoaderById?: DataLoader<string, OrderDto>;

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
    const serviceSubscriptions = [
      { topicName: Subjects.FETCH_ORDER_REQUEST, handler: this.handleFetchOrderRequest }
    ];

    const transactionSubscriptions = [
      { topicName: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS, handler: this.handleUpdateOrderStatus },
      { topicName: Subjects.TRANSACTION_COMPENSATION_START, handler: this.handleTransactionCompensationStart },
      { topicName: Subjects.TRANSACTION_COMPLETED, handler: this.handleTransactionCompleted }
    ];

    for (const { topicName, handler } of serviceSubscriptions) {
      await this.kafka.subscribe({ topicName, handler: handler.bind(this), options: { groupId: GroupIds.ORDER_SERVICE_APP_GROUP } });
    }

    for (const { topicName, handler } of transactionSubscriptions) {
      await this.kafka.subscribe({ topicName, handler: handler.bind(this), options: { groupId: GroupIds.ORDER_SERVICE_TRANSACTION_GROUP } });
    }
  }

  async requestUserData (options: KafkaRequestOptions[]): Promise<string[]> {
    return await this.kafka.requestResponse(options);
  }

  private async handleFetchOrderRequest (message: string): Promise<void> {
    await this.getBy(message);
  }

  @EventPublisherDecorator(orderEventPublisher.ORDER_GET_BY)
  private async getBy (message: string) {
    const { message: request } = JSON.parse(message);
    const { orderId } = JSON.parse(request);

    return await this.orderDtoLoaderById.load(orderId);
  }

  private async handleTransactionCompensationStart (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, failedStep } = message;

    LoggerTracerInfrastructure.log(`Order service received compensation start for transaction ${transactionId}, failed step: ${failedStep}`);

    if (failedStep === Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS) {
      await this.transactionManager.handleCompensation(transactionId);
    }
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

  private async handleTransactionCompleted (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, processType } = message;

    LoggerTracerInfrastructure.log(`Order service notified of completed transaction: ${transactionId}, type: ${processType}`);
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_COMPLETED)
  private handleUpdateOrderStatusPublisher (transactionId: string, orderId: string) {
    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS,
      status: ProcessStepStatus.COMPLETED,
      payload: {
        orderId,
        orderStatus: OrderStatus.COMPLETED
      }
    };
  }
}
