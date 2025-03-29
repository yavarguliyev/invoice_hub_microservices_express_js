import { Container } from 'typedi';
import { plainToInstance } from 'class-transformer';
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
  InvoiceDto,
  GenerateInvoiceArgs,
  DataLoaderInfrastructure,
  ContainerKeys,
  ResponseResults,
  ResultMessage,
  RedisCacheInvalidateDecorator,
  redisCacheConfig,
  ContainerHelper,
  ContainerItems
} from '@invoice-hub/common';

import { IInvoiceTransactionManager } from 'application/transactions/invoice-transaction.manager';
import { Invoice } from 'domain/entities/invoice.entity';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export interface IInvoiceKafkaSubscriber {
  initialize(): Promise<void>;
  publish(topic: Subjects, message: string): Promise<void>;
  publishInvoiceCreationSuccess(invoice: Invoice): Promise<InvoiceDto>;
  publishInvoiceCreationFailure(): Promise<void>;
  publish(topic: Subjects, message: string): Promise<void>;
}

export class InvoiceKafkaSubscriber implements IInvoiceKafkaSubscriber {
  private _invoiceRepository?: InvoiceRepository;
  private _kafka?: KafkaInfrastructure;
  private _transactionManager?: IInvoiceTransactionManager;
  private _invoiceDtoLoaderById?: DataLoader<string, InvoiceDto>;

  protected get invoiceRepository () {
    if (!this._invoiceRepository) {
      this._invoiceRepository = Container.get(InvoiceRepository);
    }

    return this._invoiceRepository;
  }

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

  protected get invoiceDtoLoaderById () {
    if (!this._invoiceDtoLoaderById) {
      this._invoiceDtoLoaderById = Container.get<DataLoaderInfrastructure<Invoice>>(ContainerKeys.INVOICE_DATA_LOADER)
        .getDataLoader({ entity: Invoice, Dto: InvoiceDto, fetchField: 'id' });
    }

    return this._invoiceDtoLoaderById;
  }

  async initialize (): Promise<void> {
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.INVOICE_GENERATE,
        handler: this.handleInvoiceGeneration.bind(this),
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
      })
    ]);
  }

  @EventPublisherDecorator(eventPublisherConfig.INVOICE_CREATE_SUCCESS)
  async publishInvoiceCreationSuccess (invoice: Invoice): Promise<InvoiceDto> {
    LoggerTracerInfrastructure.log(`Publishing invoice creation success for invoice: ${invoice.id}`);
    return plainToInstance(InvoiceDto, invoice, { excludeExtraneousValues: true });
  }

  @EventPublisherDecorator(eventPublisherConfig.INVOICE_CREATE_FAILED)
  async publishInvoiceCreationFailure (): Promise<void> {
    LoggerTracerInfrastructure.log('Publishing invoice creation failure');
  }

  async publish (topic: Subjects, message: string): Promise<void> {
    await this.kafka.publish({ topicName: topic, message });
  }

  private async handleInvoiceGeneration (messageStr: string): Promise<void> {
    await this.generateInvoice(JSON.parse(messageStr) as GenerateInvoiceArgs);
  }

  @RedisCacheInvalidateDecorator(redisCacheConfig.INVOICE_LIST)
  private async generateInvoice (args: GenerateInvoiceArgs): Promise<ResponseResults<InvoiceDto>> {
    if (!args.orderId || !args.totalAmount || !args.userId) {
      await this.publishInvoiceCreationFailure();
      return { result: ResultMessage.ERROR };
    }

    const { orderId, userId, totalAmount, newInvoiceStatus: status } = args;

    const title = `Invoice for Order #${args.orderId}`;
    const description = 'Invoice generated for completed order.';
    const pdfUrl = 'some pdf file could be generated for that in the future...';

    const invoiceData = { orderId, userId, totalAmount, status, title, description, pdfUrl };
    const invoice = this.invoiceRepository.create(invoiceData);
    const savedInvoice = await this.invoiceRepository.save(invoice);
    const singleInvoice = Array.isArray(savedInvoice) ? savedInvoice[0] : savedInvoice;

    const result = await this.publishInvoiceCreationSuccess(singleInvoice);

    return { payload: result, result: ResultMessage.SUCCESS };
  }

  private async handleTransactionInvoiceGeneration (messageStr: string): Promise<void> {
    const message = JSON.parse(messageStr);
    const { transactionId, orderId, userId, totalAmount } = message;

    const invoice = await this.transactionManager.generateInvoiceInTransaction(
      transactionId,
      orderId,
      userId,
      totalAmount
    );

    await this.publish(
      Subjects.TRANSACTION_STEP_COMPLETED, JSON.stringify({
        transactionId,
        processType: ProcessType.ORDER_APPROVAL,
        stepName: Subjects.INVOICE_GENERATE,
        status: ProcessStepStatus.COMPLETED,
        payload: {
          invoiceId: invoice.id,
          invoiceStatus: invoice.status
        }
      })
    );
  }

  private async handleCompensateInvoiceGeneration (messageStr: string): Promise<void> {
    try {
      const message = JSON.parse(messageStr);
      const { transactionId, orderId, userId, totalAmount } = message;

      if (totalAmount <= 0) {
        throw new Error('Cannot generate invoice with negative or zero amount');
      }

      const invoice = await this.transactionManager.generateInvoiceInTransaction(
        transactionId,
        orderId,
        userId,
        totalAmount
      );

      await this.publish(
        Subjects.TRANSACTION_STEP_COMPLETED, JSON.stringify({
          transactionId,
          processType: ProcessType.ORDER_APPROVAL,
          stepName: Subjects.INVOICE_GENERATE,
          status: ProcessStepStatus.COMPLETED,
          payload: {
            invoiceId: invoice.id,
            invoiceStatus: invoice.status
          }
        })
      );
    } catch (error) {
      const message = JSON.parse(messageStr);
      const { transactionId } = message;

      LoggerTracerInfrastructure.log(`Failed to generate invoice: ${error instanceof Error ? error.message : String(error)}`);

      await this.publish(
        Subjects.TRANSACTION_STEP_FAILED, JSON.stringify({
          transactionId,
          processType: ProcessType.ORDER_APPROVAL,
          stepName: Subjects.INVOICE_GENERATE,
          status: ProcessStepStatus.FAILED,
          error: error instanceof Error ? error.message : 'Failed to generate invoice'
        })
      );
    }
  }
}
