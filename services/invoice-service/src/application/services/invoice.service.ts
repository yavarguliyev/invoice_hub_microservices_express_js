import { Container } from 'typedi';
import { plainToInstance } from 'class-transformer';
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
  RedisCacheInvalidateDecorator
} from '@invoice-hub/common';

import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export interface IInvoiceService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  getById (args: GetInvoiceArgs): Promise<ResponseResults<InvoiceDto>>;
  generateInvoice (message: string): Promise<ResponseResults<InvoiceDto>>;
}

export class InvoiceService implements IInvoiceService {
  private invoiceRepository: InvoiceRepository;
  private kafka: KafkaInfrastructure;

  constructor () {
    this.invoiceRepository = Container.get(InvoiceRepository);
    this.kafka = Container.get(KafkaInfrastructure);
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
    const invoice = await this.invoiceRepository.findOneByOrFail({ id: args.id });

    const invoiceDto = plainToInstance(InvoiceDto, invoice, { excludeExtraneousValues: true });
    const options = buildKafkaRequestOptionsHelper(invoice);

    const [orderResponse, userResponse] = await this.kafka.requestResponse(options);

    const order = JSON.parse(orderResponse);
    const user = JSON.parse(userResponse);
    const payload = { ...invoiceDto, order, user };

    return { payload, result: ResultMessage.SUCCESS };
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
}
