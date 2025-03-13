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
  ContainerKeys
} from '@invoice-hub/common';

import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  getById (args: GetInvoiceArgs): Promise<ResponseResults<InvoiceDto>>;
  generateInvoice (message: string): Promise<ResponseResults<InvoiceDto>>;
}

export class InvoiceService implements IInvoiceService {
  private _invoiceRepository?: InvoiceRepository;
  private _kafka?: KafkaInfrastructure;
  private _invoiceDtoLoaderById?: DataLoader<string, InvoiceDto>;

  private get invoiceRepository (): InvoiceRepository {
    if (!this._invoiceRepository) {
      this._invoiceRepository = Container.get(InvoiceRepository);
    }

    return this._invoiceRepository;
  }

  private get kafka (): KafkaInfrastructure {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }

    return this._kafka;
  }

  private get invoiceDtoLoaderById (): DataLoader<string, InvoiceDto> {
    if (!this._invoiceDtoLoaderById) {
      this._invoiceDtoLoaderById = Container.get<DataLoaderInfrastructure<Invoice>>(ContainerKeys.INVOICE_DATA_LOADER)
        .getDataLoader({ entity: Invoice, Dto: InvoiceDto, fetchField: 'id' });
    }

    return this._invoiceDtoLoaderById;
  }

  async initialize () {
    await this.kafka.subscribe({
      topicName: Subjects.INVOICE_GENERATE, handler: this.generateInvoice.bind(this), options: { groupId: GroupIds.INVOICE_SERVICE_GROUP }
    });
  }

  @RedisDecorator<InvoiceDto>(redisCacheConfig.INVOICE_LIST)
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

  @RedisCacheInvalidateDecorator(redisCacheConfig.INVOICE_LIST)
  async generateInvoice (message: string) {
    const args = JSON.parse(message) as GenerateInvoiceArgs;
    const invoiceData = this.createInvoice(args);
    const invoice = this.invoiceRepository.create(invoiceData);

    await this.invoiceRepository.save(invoice);
    LoggerTracerInfrastructure.log(`Generated Invoice Id: ${invoice.id} for the order id: ${invoice.orderId}...`);
    // TODO: Notify the user with an email that includes an attachment for the invoice.

    return { result: ResultMessage.SUCCESS };
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
