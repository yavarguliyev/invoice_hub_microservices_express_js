import { Container } from 'typedi';
import {
  KafkaInfrastructure,
  GroupIds,
  Subjects,
  LoggerTracerInfrastructure,
  EventPublisherDecorator,
  ContainerHelper,
  ContainerItems,
  transactionEventPublisher,
  BadRequestError,
  ProcessType,
  ProcessStepStatus,
  getErrorMessage
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
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.TRANSACTION_COMPENSATION_START,
        handler: this.handleTransactionCompensationStart.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE,
        handler: this.handleTransactionInvoiceGeneration.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_COMPENSATE_INVOICE_GENERATE,
        handler: this.handleCompensateInvoiceGeneration.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.TRANSACTION_COMPLETED,
        handler: this.handleTransactionCompleted.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      })
    ]);
  }

  private async handleTransactionCompensationStart (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, failedStep } = message;

    LoggerTracerInfrastructure.log(`Invoice service received compensation start for transaction ${transactionId}, failed step: ${failedStep}`);
  }

  private async handleTransactionInvoiceGeneration (messageStr: string): Promise<void> {
    try {
      const message = JSON.parse(messageStr);
      const { transactionId, orderId, userId, totalAmount } = message;

      LoggerTracerInfrastructure.log(`Processing invoice generation for transaction ${transactionId}, orderId: ${orderId}`);

      const invoice = await this.transactionManager.generateInvoiceInTransaction(
        transactionId,
        orderId,
        userId,
        totalAmount
      );

      LoggerTracerInfrastructure.log(`Invoice generated with ID: ${invoice.id} in transaction ${transactionId}`);
      this.handleTransactionInvoiceGenerationPublisher(transactionId, invoice);
    } catch (error) {
      const message = JSON.parse(messageStr);
      this.handleCompensateInvoiceGenerationFailPublisher(message.transactionId, error);
    }
  }

  private async handleCompensateInvoiceGeneration (messageStr: string): Promise<void> {
    try {
      const message = JSON.parse(messageStr);
      const { transactionId, orderId, userId, totalAmount } = message;

      if (totalAmount <= 0) {
        throw new BadRequestError('Cannot generate invoice with negative or zero amount');
      }

      const invoice = await this.transactionManager.generateInvoiceInTransaction(
        transactionId,
        orderId,
        userId,
        totalAmount
      );

      this.handleTransactionInvoiceGenerationPublisher(transactionId, invoice);
    } catch (error) {
      const message = JSON.parse(messageStr);
      this.handleCompensateInvoiceGenerationFailPublisher(message.transactionId, error);
    }
  }

  private async handleTransactionCompleted (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, processType } = message;

    LoggerTracerInfrastructure.log(`Invoice service notified of completed transaction: ${transactionId}, type: ${processType}`);
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_COMPLETED)
  private handleTransactionInvoiceGenerationPublisher (transactionId: string, invoice: Invoice) {
    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.INVOICE_GENERATE,
      status: ProcessStepStatus.COMPLETED,
      payload: {
        invoiceId: invoice.id,
        invoiceStatus: invoice.status
      }
    };
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_FAILED)
  private handleCompensateInvoiceGenerationFailPublisher (transactionId: string, error: unknown) {
    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.INVOICE_GENERATE,
      status: ProcessStepStatus.FAILED,
      error: getErrorMessage(error)
    };
  }
}
