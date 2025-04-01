import { Container } from 'typedi';
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
  getErrorMessage,
  EVENT_PUBLISHER_OPERATION
} from '@invoice-hub/common';

import { IInvoiceTransactionManager } from 'application/transactions/invoice-transaction.manager';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceKafkaSubscriber {
  initialize(): Promise<void>;
}

export class InvoiceKafkaSubscriber implements IInvoiceKafkaSubscriber {
  // #region DI
  private _kafka?: KafkaInfrastructure;
  private _transactionManager?: IInvoiceTransactionManager;
  private isInitialized = false;

  private get kafka () {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }
    return this._kafka;
  }

  private get transactionManager () {
    if (!this._transactionManager) {
      this._transactionManager = ContainerHelper.get<IInvoiceTransactionManager>(ContainerItems.IInvoiceTransactionManager);
    }
    return this._transactionManager;
  }
  // #endregion

  async initialize (): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const subscriptions = [
      {
        topic: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE,
        handler: this.handleTransactionInvoiceGeneration.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_APP_GROUP }
      },
      {
        topic: Subjects.TRANSACTION_USER_NOTIFICATION,
        handler: this.handleUserNotification.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_TRANSACTION_GROUP }
      }
    ];

    for (const { topic, handler, options } of subscriptions) {
      await this.kafka.subscribe({ topicName: topic, handler: handler.bind(this), options });
    }

    this.isInitialized = true;
  }

  private async handleTransactionInvoiceGeneration (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { orderId, userId, totalAmount, transactionId } = message;

    if (!userId || !orderId || totalAmount === undefined) {
      return;
    }

    const invoice = await this.transactionManager.generateInvoiceInTransaction(
      orderId,
      userId,
      totalAmount
    );

    LoggerTracerInfrastructure.log(`Invoice generated with ID: ${invoice.id} in transaction ${transactionId}`);
    this.handleTransactionInvoiceGenerationPublisher(transactionId, invoice);
  }

  private async handleUserNotification (messageStr: string): Promise<void> {
    try {
      const notification = JSON.parse(messageStr);

      LoggerTracerInfrastructure.log(`USER NOTIFICATION: Transaction ${notification.transactionId} for user ${notification.userId} has ${notification.status}`);
      LoggerTracerInfrastructure.log(`Error details: ${notification.error}`);

      if (notification.details) {
        LoggerTracerInfrastructure.log(`Additional details: ${JSON.stringify(notification.details)}`);
      }

      // In a real application, this would integrate with an email/SMS/push notification service
      // For example:
      // await this.notificationService.sendEmail(notification.userId,
      //   `Order Processing Update`,
      //   `Your order ${notification.details.orderId} could not be processed: ${notification.error}`);

      LoggerTracerInfrastructure.log(`Successfully processed user notification for transaction ${notification.transactionId}`);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error processing user notification: ${getErrorMessage(error)}`);
    }
  }

  @EventPublisherDecorator(EVENT_PUBLISHER_OPERATION)
  private handleTransactionInvoiceGenerationPublisher (transactionId: string, invoice: Invoice) {
    return {
      topicName: Subjects.TRANSACTION_STEP_COMPLETED,
      message: {
        transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE,
        status: ProcessStepStatus.COMPLETED,
        payload: {
          invoiceId: invoice.id,
          invoiceStatus: invoice.status
        }
      }
    };
  }
}
