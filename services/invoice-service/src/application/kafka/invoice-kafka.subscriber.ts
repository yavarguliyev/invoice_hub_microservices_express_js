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
  transactionEventPublisher
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
    const serviceSubscriptions = [
      { topicName: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE, handler: this.handleTransactionInvoiceGeneration }
    ];

    const transactionSubscriptions = [
      { topicName: Subjects.TRANSACTION_COMPENSATION_START, handler: this.handleTransactionCompensationStart },
      { topicName: Subjects.TRANSACTION_COMPLETED, handler: this.handleTransactionCompleted }
    ];

    for (const { topicName, handler } of serviceSubscriptions) {
      await this.kafka.subscribe({ topicName, handler: handler.bind(this), options: { groupId: GroupIds.INVOICE_SERVICE_APP_GROUP } });
    }

    for (const { topicName, handler } of transactionSubscriptions) {
      await this.kafka.subscribe({ topicName, handler: handler.bind(this), options: { groupId: GroupIds.INVOICE_SERVICE_TRANSACTION_GROUP } });
    }
  }

  private async handleTransactionCompensationStart (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, failedStep } = message;

    LoggerTracerInfrastructure.log(`Invoice service received compensation start for transaction ${transactionId}, failed step: ${failedStep}`);

    if (failedStep === Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE) {
      await this.transactionManager.handleCompensation(transactionId);
    }
  }

  private async handleTransactionInvoiceGeneration (messageStr: string): Promise<void> {
    LoggerTracerInfrastructure.log(`Invoice service received message: ${messageStr}`);

    try {
      const message = JSON.parse(messageStr);
      LoggerTracerInfrastructure.log(`Parsed message: ${JSON.stringify(message)}`);

      const { transactionId, orderId, totalAmount } = message;

      if (!transactionId || !orderId || totalAmount === undefined) {
        LoggerTracerInfrastructure.log(`Missing required fields in message: transactionId=${transactionId}, orderId=${orderId}, totalAmount=${totalAmount}`);
        return;
      }

      const invoice = await this.transactionManager.generateInvoiceInTransaction(
        transactionId,
        orderId,
        totalAmount
      );

      LoggerTracerInfrastructure.log(`Invoice generated with ID: ${invoice.id} in transaction ${transactionId}`);
      this.handleTransactionInvoiceGenerationPublisher(transactionId, invoice);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error in handleTransactionInvoiceGeneration: ${getErrorMessage(error)}`);
      const message = JSON.parse(messageStr);
      this.handleTransactionInvoiceGenerationFailPublisher(message.transactionId, error);
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
      stepName: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE,
      status: ProcessStepStatus.COMPLETED,
      payload: {
        invoiceId: invoice.id,
        invoiceStatus: invoice.status
      }
    };
  }

  @EventPublisherDecorator(transactionEventPublisher.TRANSACTION_STEP_FAILED)
  private handleTransactionInvoiceGenerationFailPublisher (transactionId: string, error: unknown) {
    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.ORDER_APPROVAL_STEP_INVOICE_GENERATE,
      status: ProcessStepStatus.FAILED,
      error: getErrorMessage(error)
    };
  }
}
