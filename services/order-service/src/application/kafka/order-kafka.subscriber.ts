import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  LoggerTracerInfrastructure,
  EventPublisherDecorator,
  orderEventPublisher,
  OrderStatus,
  DataLoaderInfrastructure,
  ContainerKeys,
  OrderDto,
  KafkaRequestOptions,
  ContainerHelper,
  ContainerItems,
  BadRequestError,
  transactionEventPublisher,
  ProcessStepStatus,
  ProcessType
} from '@invoice-hub/common';

import { IOrderTransactionManager } from 'application/transactions/order-transaction.manager';
import { Order } from 'domain/entities/order.entity';

export interface IOrderKafkaSubscriber {
  initialize(): Promise<void>;
  requestUserData(options: KafkaRequestOptions[]): Promise<string[]>;
  handleCompensateOrderStatusFailedPublisher(transactionId: string, order: Order): unknown;
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
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.FETCH_ORDER_REQUEST,
        handler: this.handleOrderFetchRequest.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.TRANSACTION_COMPENSATION_START,
        handler: this.handleTransactionCompensationStart.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS,
        handler: this.handleUpdateOrderStatus.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS,
        handler: this.handleCompensateOrderStatus.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.TRANSACTION_COMPLETED,
        handler: this.handleTransactionCompleted.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      })
    ]);
  }

  async requestUserData (options: KafkaRequestOptions[]): Promise<string[]> {
    return await this.kafka.requestResponse(options);
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_FAILED)
  handleCompensateOrderStatusFailedPublisher (transactionId: string, order: Order) {
    return { ...order, transactionId, error: 'Invalid total amount' };
  }

  private async handleOrderFetchRequest (message: string): Promise<void> {
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

  private async handleCompensateOrderStatus (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, orderId } = message;

    await this.transactionManager.compensateOrderStatus(orderId, transactionId);
    this.handleCompensateOrderStatusPublisher(transactionId);
  }

  private async handleTransactionCompleted (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, processType } = message;

    LoggerTracerInfrastructure.log(`Invoice service notified of completed transaction: ${transactionId}, type: ${processType}`);
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_COMPLETED)
  private handleUpdateOrderStatusPublisher (transactionId: string, orderId: string) {
    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.UPDATE_ORDER_STATUS,
      status: ProcessStepStatus.COMPLETED,
      payload: {
        orderId,
        orderStatus: OrderStatus.COMPLETED
      }
    };
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_COMPENSATION_COMPLETED)
  private handleCompensateOrderStatusPublisher (transactionId: string) {
    return {
      transactionId: transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.UPDATE_ORDER_STATUS,
      status: ProcessStepStatus.COMPENSATED
    };
  }
}
