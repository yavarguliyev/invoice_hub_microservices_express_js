import { Container } from 'typedi';
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
  Subjects
} from '@invoice-hub/common';

import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export interface IInvoiceService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  generateInvoice (message: string): Promise<ResponseResults<InvoiceDto>>;
}

export class InvoiceService implements IInvoiceService {
  private invoiceRepository: InvoiceRepository;

  constructor () {
    this.invoiceRepository = Container.get(InvoiceRepository);
  }

  async initialize () {
    await KafkaInfrastructure.subscribe(Subjects.INVOICE_GENERATE, this.generateInvoice.bind(this), { groupId: GroupIds.INVOICE_SERVICE_GROUP });
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.invoiceRepository, query, dtoClass: InvoiceDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

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
