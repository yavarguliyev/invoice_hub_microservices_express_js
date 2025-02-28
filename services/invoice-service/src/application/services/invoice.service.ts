import { KafkaInfrastructure, LoggerTracerInfrastructure } from '@invoice-hub/common-packages';

export interface IInvoiceService {
  initialize (): Promise<void>;
  handleInvoiceGeneration (message: string): Promise<any>;
  get (): Promise<any>;
}

export class InvoiceService implements IInvoiceService {
  constructor () {}

  async initialize () {
    await KafkaInfrastructure.subscribe('invoice-generate', this.handleInvoiceGeneration.bind(this), { groupId: 'invoice-service-group' });
  }

  async handleInvoiceGeneration (message: string) {
    const { orderId, order } = JSON.parse(message);
    const invoiceId = Math.floor(Math.random() * 1000);

    LoggerTracerInfrastructure.log(`Generated Invoice Id: ${invoiceId} for the order id: ${orderId}: ${JSON.stringify({ order })}...`);
  }

  async get () {
    return { result: 'SUCCEED' };
  }
}
