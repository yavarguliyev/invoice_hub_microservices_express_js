import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  LoggerTracerInfrastructure,
  EventPublisherDecorator,
  eventPublisherConfig,
  ProcessType,
  ProcessStepStatus,
  OrderStatus,
  DataLoaderInfrastructure,
  ContainerKeys,
  OrderDto,
  KafkaRequestOptions,
  ContainerHelper,
  ContainerItems,
  BadRequestError
} from '@invoice-hub/common';

import { IOrderTransactionManager } from 'application/transactions/order-transaction.manager';
import { Order } from 'domain/entities/order.entity';

export interface IOrderKafkaSubscriber {
  initialize(): Promise<void>;
  requestUserData(options: KafkaRequestOptions[]): Promise<string[]>;
  publish(topic: Subjects, message: string): Promise<void>;
}

export class OrderKafkaSubscriber implements IOrderKafkaSubscriber {
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

  async initialize (): Promise<void> {
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.FETCH_ORDER_REQUEST,
        handler: this.handleOrderFetchRequest.bind(this),
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
      })
    ]);
  }

  async requestUserData (options: KafkaRequestOptions[]): Promise<string[]> {
    return await this.kafka.requestResponse(options);
  }

  async publish (topic: Subjects, message: string): Promise<void> {
    await this.kafka.publish({ topicName: topic, message });
  }

  private async handleOrderFetchRequest (message: string): Promise<void> {
    await this.getBy(message);
  }

  @EventPublisherDecorator(eventPublisherConfig.ORDER_GET_BY)
  private async getBy (message: string) {
    const { message: request } = JSON.parse(message);
    const { orderId } = JSON.parse(request);

    return await this.orderDtoLoaderById.load(orderId);
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

    LoggerTracerInfrastructure.log(`Updating order status for order ${orderId} in transaction ${transactionId}`);
    await this.transactionManager.updateOrderStatus(orderId, transactionId, OrderStatus.COMPLETED);

    await this.publish(
      Subjects.TRANSACTION_STEP_COMPLETED, JSON.stringify({
        transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.COMPLETED,
        payload: {
          orderId,
          orderStatus: OrderStatus.COMPLETED
        }
      })
    );
  }

  private async handleCompensateOrderStatus (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, orderId } = message;

    LoggerTracerInfrastructure.log(`Compensating order ${orderId} status in transaction ${transactionId}`);

    await this.transactionManager.compensateOrderStatus(orderId, transactionId);

    await this.publish(
      Subjects.TRANSACTION_COMPENSATION_COMPLETED, JSON.stringify({
        transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.UPDATE_ORDER_STATUS,
        status: ProcessStepStatus.COMPENSATED
      })
    );
  }
}
