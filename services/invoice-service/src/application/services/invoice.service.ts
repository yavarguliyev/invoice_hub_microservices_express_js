import { Container } from 'typedi';
import {
  GetQueryResultsArgs, GroupIds, InvoiceDto, KafkaInfrastructure, LoggerTracerInfrastructure, queryResults, ResponseResults, ResultMessage, Subjects
} from '@invoice-hub/common';

import { InvoiceRepository } from 'domain/repositories/invoice.repository';

export interface IInvoiceService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  handleInvoiceGeneration (message: string): Promise<any>;
}

export class InvoiceService implements IInvoiceService {
  private invoiceRepository: InvoiceRepository;

  constructor () {
    this.invoiceRepository = Container.get(InvoiceRepository);
  }

  async initialize () {
    await KafkaInfrastructure.subscribe(Subjects.INVOICE_GENERATE, this.handleInvoiceGeneration.bind(this), { groupId: GroupIds.INVOICE_SERVICE_GROUP });
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.invoiceRepository, query, dtoClass: InvoiceDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async handleInvoiceGeneration (message: string) {
    const { orderId, order } = JSON.parse(message);
    const invoiceId = Math.floor(Math.random() * 1000);

    LoggerTracerInfrastructure.log(`Generated Invoice Id: ${invoiceId} for the order id: ${orderId}: ${JSON.stringify({ order })}...`);
  }
}
