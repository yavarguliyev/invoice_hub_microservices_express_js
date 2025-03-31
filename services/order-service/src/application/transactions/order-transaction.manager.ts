import { Container } from 'typedi';
import {
  TransactionCoordinatorInfrastructure,
  ClientIds,
  ProcessType,
  Subjects,
  LoggerTracerInfrastructure,
  OrderStatus,
  GroupIds,
  getErrorMessage
} from '@invoice-hub/common';

import { OrderRepository } from 'domain/repositories/order.repository';
import { Order } from 'domain/entities/order.entity';

export interface IOrderTransactionManager {
  initialize(): Promise<void>;
  startOrderTransaction(order: Order): Promise<{ transactionId: string }>;
  startFailedOrderTransaction (order: Order, reason: string, finalStatus: OrderStatus): Promise<string>;
  updateOrderStatus(orderId: string, transactionId: string, targetStatus: OrderStatus): Promise<void>;
  handleCompensation(transactionId: string): Promise<void>;
}

export class OrderTransactionManager implements IOrderTransactionManager {
  // #region DI
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
  // #endregion

  async initialize (): Promise<void> {
    await this.transactionCoordinator.initialize(GroupIds.ORDER_SERVICE_TRANSACTION_GROUP);
  }

  async startOrderTransaction (order: Order): Promise<{ transactionId: string }> {
    const { id: orderId, userId, totalAmount } = order;

    const transactionId = await this.transactionCoordinator.startTransaction({
      processType: ProcessType.ORDER_APPROVAL,
      payload: { orderId, userId, totalAmount },
      initiatedBy: userId,
      steps: [
        { name: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS, service: ClientIds.ORDER_SERVICE },
        { name: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE, service: ClientIds.INVOICE_SERVICE }
      ]
    });

    return { transactionId };
  }

  async startFailedOrderTransaction (order: Order, reason: string, finalStatus: OrderStatus): Promise<string> {
    const { id: orderId, userId, totalAmount } = order;

    const transactionId = await this.transactionCoordinator.startTransaction({
      processType: ProcessType.ORDER_APPROVAL,
      initiatedBy: order.userId,
      payload: { orderId, userId, totalAmount, failureReason: reason, finalStatus },
      steps: [
        { name: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS, service: ClientIds.ORDER_SERVICE },
        { name: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE, service: ClientIds.INVOICE_SERVICE }
      ]
    });

    await this.orderRepository.save({ ...order, status: finalStatus });

    return transactionId;
  }

  async updateOrderStatus (orderId: string, transactionId: string, targetStatus: OrderStatus): Promise<void> {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId } });
    await this.orderRepository.save({ ...order, status: targetStatus });

    LoggerTracerInfrastructure.log(`Updated order ${orderId} status to ${targetStatus} in transaction ${transactionId}`);
  }

  async handleCompensation (transactionId: string): Promise<void> {
    try {
      const transaction = await this.transactionCoordinator.getTransactionState(transactionId);
      if (!transaction) {
        LoggerTracerInfrastructure.log(`No transaction found for compensation: ${transactionId}`);
        return;
      }

      const order = await this.orderRepository.findOne({ where: { id: String(transaction.payload?.orderId) } });
      if (!order) {
        LoggerTracerInfrastructure.log(`No order found for transaction: ${transactionId}`);
        return;
      }

      if (order.status === OrderStatus.COMPLETED) {
        await this.orderRepository.update(order.id, { status: OrderStatus.PENDING, updatedAt: new Date() });
      }

      LoggerTracerInfrastructure.log(`Order compensation completed for transaction: ${transactionId}`);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error during order compensation: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
