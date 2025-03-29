import { Container } from 'typedi';
import {
  TransactionCoordinatorInfrastructure,
  ClientIds,
  ProcessType,
  Subjects,
  LoggerTracerInfrastructure,
  ResponseResults,
  ResultMessage,
  OrderStatus,
  ProcessStepStatus,
  DistributedTransactionStatus,
  GroupIds
} from '@invoice-hub/common';

import { OrderRepository } from 'domain/repositories/order.repository';
import { Order } from 'domain/entities/order.entity';

export interface IOrderTransactionManager {
  initialize(): Promise<void>;
  startOrderTransaction(order: Order): Promise<{ transactionId: string }>;
  startFailedOrderTransaction (order: Order, reason: string, finalStatus: OrderStatus): Promise<string>;
  getOrderTransaction(orderId: string): Promise<ResponseResults<unknown>>;
  updateOrderStatus(orderId: string, transactionId: string, targetStatus: OrderStatus): Promise<void>;
  compensateOrderStatus(orderId: string, transactionId: string): Promise<void>;
}

export class OrderTransactionManager implements IOrderTransactionManager {
  private _transactionCoordinator?: TransactionCoordinatorInfrastructure;
  private _orderRepository?: OrderRepository;

  private get transactionCoordinator () {
    if (!this._transactionCoordinator) {
      this._transactionCoordinator = Container.get(TransactionCoordinatorInfrastructure);
    }

    return this._transactionCoordinator;
  }

  private get orderRepository () {
    if (!this._orderRepository) {
      this._orderRepository = Container.get(OrderRepository);
    }

    return this._orderRepository;
  }

  async initialize (): Promise<void> {
    await this.transactionCoordinator.initialize(GroupIds.ORDER_SERVICE_GROUP);
  }

  async startOrderTransaction (order: Order): Promise<{ transactionId: string }> {
    const { id: orderId, userId, totalAmount } = order;

    const transactionId = await this.transactionCoordinator.startTransaction({
      processType: ProcessType.ORDER_APPROVAL,
      payload: { orderId, userId, totalAmount },
      initiatedBy: userId,
      steps: [
        { name: Subjects.UPDATE_ORDER_STATUS, service: ClientIds.ORDER_SERVICE },
        { name: Subjects.INVOICE_GENERATE, service: ClientIds.INVOICE_SERVICE }
      ]
    });

    LoggerTracerInfrastructure.log(`Started transaction ${transactionId} for order ${order.id}`);

    return { transactionId };
  }

  async startFailedOrderTransaction (order: Order, reason: string, finalStatus: OrderStatus): Promise<string> {
    const { id: orderId, userId, totalAmount } = order;

    const transactionId = await this.transactionCoordinator.startTransaction({
      processType: ProcessType.ORDER_APPROVAL,
      initiatedBy: order.userId,
      payload: { orderId, userId, totalAmount, failureReason: reason, finalStatus },
      steps: [
        { name: Subjects.UPDATE_ORDER_STATUS, service: ClientIds.ORDER_SERVICE },
        { name: Subjects.INVOICE_GENERATE, service: ClientIds.INVOICE_SERVICE }
      ]
    });

    await this.orderRepository.save({ ...order, status: finalStatus });

    LoggerTracerInfrastructure.log(`Started failed transaction ${transactionId} for order ${order.id}: ${reason}`);

    return transactionId;
  }

  async getOrderTransaction (orderId: string): Promise<ResponseResults<unknown>> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return { result: ResultMessage.ERROR };
    }

    // In a real implementation, we would have a database or Redis lookup
    // that maps order IDs to transaction IDs
    // For now, we'll return a mock transaction state for demonstration purposes

    // Use the order status to determine the transaction status
    let mockTransactionStatus: DistributedTransactionStatus;
    switch (order.status) {
      case OrderStatus.COMPLETED:
        mockTransactionStatus = DistributedTransactionStatus.COMPLETED;
        break;
      case OrderStatus.PENDING:
        mockTransactionStatus = DistributedTransactionStatus.IN_PROGRESS;
        break;
      default:
        mockTransactionStatus = DistributedTransactionStatus.FAILED;
    }

    // Create a mock transaction ID based on the order ID
    const mockTransactionId = `tx-${orderId.substring(0, 8)}`;

    // Return a simulated transaction state
    return {
      result: ResultMessage.SUCCESS,
      payload: {
        transactions: [
          {
            transactionId: mockTransactionId,
            status: mockTransactionStatus,
            startedAt: order.createdAt,
            completedAt: order.status === OrderStatus.COMPLETED ? order.updatedAt : null,
            steps: [
              {
                name: Subjects.UPDATE_ORDER_STATUS,
                service: ClientIds.ORDER_SERVICE,
                status: order.status === OrderStatus.COMPLETED ? ProcessStepStatus.COMPLETED : ProcessStepStatus.PENDING
              },
              {
                name: Subjects.INVOICE_GENERATE,
                service: ClientIds.INVOICE_SERVICE,
                status: order.status === OrderStatus.COMPLETED ? ProcessStepStatus.COMPLETED : ProcessStepStatus.PENDING
              }
            ]
          }
        ]
      }
    };
  }

  async updateOrderStatus (orderId: string, transactionId: string, targetStatus: OrderStatus): Promise<void> {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId } });
    await this.orderRepository.save({ ...order, status: targetStatus });

    LoggerTracerInfrastructure.log(`Updated order ${orderId} status to ${targetStatus} in transaction ${transactionId}`);
  }

  async compensateOrderStatus (orderId: string, transactionId: string): Promise<void> {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId } });

    if (order.status === OrderStatus.COMPLETED) {
      await this.orderRepository.save({ ...order, status: OrderStatus.PENDING });
      LoggerTracerInfrastructure.log(`Compensated order ${orderId} status to PENDING in transaction ${transactionId}`);
    }
  }
}
