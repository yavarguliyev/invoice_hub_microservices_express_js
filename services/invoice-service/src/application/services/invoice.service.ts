import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  GetQueryResultsArgs,
  GroupIds,
  InvoiceDto,
  InvoiceStatus,
  KafkaInfrastructure,
  LoggerTracerInfrastructure,
  GenerateInvoiceArgs,
  queryResults,
  ResponseResults,
  ResultMessage,
  Subjects,
  RedisDecorator,
  redisCacheConfig,
  GetInvoiceArgs,
  RedisCacheInvalidateDecorator,
  DataLoaderInfrastructure,
  ContainerKeys,
  OrderStatus,
  ProcessType,
  ProcessStepStatus,
  EventPublisherDecorator,
  eventPublisherConfig
} from '@invoice-hub/common';

import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceService {
  initialize(): Promise<void>;
  get(query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  getById(args: GetInvoiceArgs): Promise<ResponseResults<InvoiceDto>>;
}

export class InvoiceService implements IInvoiceService {
  private _invoiceRepository?: InvoiceRepository;
  private _kafka?: KafkaInfrastructure;
  private _invoiceDtoLoaderById?: DataLoader<string, InvoiceDto>;

  private get invoiceRepository () {
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

  private get invoiceDtoLoaderById () {
    if (!this._invoiceDtoLoaderById) {
      this._invoiceDtoLoaderById = Container.get<DataLoaderInfrastructure<Invoice>>(ContainerKeys.INVOICE_DATA_LOADER)
        .getDataLoader({ entity: Invoice, Dto: InvoiceDto, fetchField: 'id' });
    }

    return this._invoiceDtoLoaderById;
  }

  async initialize () {
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_STEP_GENERATE_INVOICE,
        handler: this.handleInvoiceGeneration.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_COMPENSATE_GENERATE_INVOICE,
        handler: this.handleInvoiceCancellation.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.INVOICE_GENERATE,
        handler: this.handleDirectInvoiceGeneration.bind(this),
        options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
      })
    ]);
  }

  @RedisDecorator(redisCacheConfig.INVOICE_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.invoiceRepository, query, dtoClass: InvoiceDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async getById (args: GetInvoiceArgs) {
    const invoiceDto = await this.ensureUserIdAndOrderInInvoice(args.id);
    const options = buildKafkaRequestOptionsHelper(invoiceDto);

    const [orderResponse, userResponse] = await this.kafka.requestResponse(options);

    const order = JSON.parse(orderResponse);
    const user = JSON.parse(userResponse);

    delete invoiceDto.orderId;
    delete invoiceDto.userId;

    return { payload: { ...invoiceDto, order, user }, result: ResultMessage.SUCCESS };
  }

  private async handleInvoiceGeneration (messageStr: string): Promise<void> {
    try {
      await this.publishInvoiceGenerationSuccess(messageStr);
    } catch (error) {
      await this.publishInvoiceGenerationFailure(messageStr, error);
    }
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_STEP_COMPLETED)
  private async publishInvoiceGenerationSuccess (messageStr: string): Promise<unknown> {
    const { orderId, transactionId } = JSON.parse(messageStr);

    const orderResponse = await this.kafka.requestResponse([{
      requestTopic: Subjects.FETCH_ORDER_REQUEST,
      responseTopic: Subjects.FETCH_ORDER_RESPONSE,
      message: JSON.stringify({ orderId })
    }]);

    const orderData = JSON.parse(orderResponse[0]);

    await this.generateInvoice({
      orderId,
      totalAmount: orderData.totalAmount,
      userId: orderData.userId,
      newOrderStatus: OrderStatus.COMPLETED,
      newInvoiceStatus: InvoiceStatus.PAID
    });

    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.INVOICE_GENERATE,
      status: ProcessStepStatus.COMPLETED,
      payload: { orderId }
    };
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_STEP_FAILED)
  private async publishInvoiceGenerationFailure (messageStr: string, error: unknown): Promise<unknown> {
    const { transactionId } = JSON.parse(messageStr);

    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.INVOICE_GENERATE,
      status: ProcessStepStatus.FAILED,
      error: error instanceof Error ? error.message : 'Failed to generate invoice'
    };
  }

  private async handleInvoiceCancellation (messageStr: string): Promise<void> {
    await this.publishInvoiceCancellation(messageStr);
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_COMPENSATION_COMPLETED)
  private async publishInvoiceCancellation (messageStr: string): Promise<unknown> {
    const { orderId, transactionId } = JSON.parse(messageStr);
    await this.cancelInvoiceForOrder(orderId);

    return {
      transactionId,
      processType: ProcessType.ORDER_APPROVAL,
      stepName: Subjects.INVOICE_GENERATE,
      status: ProcessStepStatus.COMPENSATED
    };
  }

  private async handleDirectInvoiceGeneration (messageStr: string): Promise<void> {
    const args = JSON.parse(messageStr) as GenerateInvoiceArgs;
    await this.generateInvoice(args);
  }

  @RedisCacheInvalidateDecorator(redisCacheConfig.INVOICE_LIST)
  private async generateInvoice (args: GenerateInvoiceArgs): Promise<void> {
    const invoiceData = this.createInvoice(args);
    const invoice = this.invoiceRepository.create(invoiceData);

    await this.invoiceRepository.save(invoice);
    LoggerTracerInfrastructure.log(`Generated Invoice Id: ${invoice.id} for the order id: ${invoice.orderId}...`);
  }

  private async cancelInvoiceForOrder (orderId: string): Promise<void> {
    const invoices = await this.invoiceRepository.find({ where: { orderId } });
    if (invoices.length === 0) {
      return;
    }

    for (const invoice of invoices) {
      invoice.status = InvoiceStatus.CANCELLED;
      invoice.description = `${invoice.description} (Cancelled as part of compensation)`;

      await this.invoiceRepository.save(invoice);
    }
  }

  private createInvoice ({ orderId, userId, totalAmount, newInvoiceStatus }: GenerateInvoiceArgs) {
    return {
      title: `Invoice for Order #${orderId}`,
      amount: totalAmount,
      description: newInvoiceStatus === InvoiceStatus.CANCELLED ? 'Invoice generated for canceled order.' : 'Invoice generated for completed order.',
      status: newInvoiceStatus,
      orderId,
      userId,
      pdfUrl: 'some pdf file could be generated for that in the future...'
    };
  }

  private async ensureUserIdAndOrderInInvoice (id: string): Promise<InvoiceDto> {
    const invoiceDto = await this.invoiceDtoLoaderById.load(id);

    if (!invoiceDto.userId || !invoiceDto.orderId) {
      this.invoiceDtoLoaderById.clear(id);
      return await this.ensureUserIdAndOrderInInvoice(id);
    }

    return invoiceDto;
  }
}
