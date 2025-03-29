import { Container } from 'typedi';
import { TransactionCoordinatorInfrastructure, LoggerTracerInfrastructure, InvoiceStatus, GroupIds } from '@invoice-hub/common';

import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceTransactionManager {
  initialize(): Promise<void>;
  generateInvoiceInTransaction(transactionId: string, orderId: string, userId: string, totalAmount: number): Promise<Invoice>;
  compensateInvoice(transactionId: string, orderId: string): Promise<void>;
}

export class InvoiceTransactionManager implements IInvoiceTransactionManager {
  private _transactionCoordinator?: TransactionCoordinatorInfrastructure;
  private _invoiceRepository?: InvoiceRepository;

  private get transactionCoordinator () {
    if (!this._transactionCoordinator) {
      this._transactionCoordinator = Container.get(TransactionCoordinatorInfrastructure);
    }

    return this._transactionCoordinator;
  }

  private get invoiceRepository () {
    if (!this._invoiceRepository) {
      this._invoiceRepository = Container.get(InvoiceRepository);
    }

    return this._invoiceRepository;
  }

  async initialize (): Promise<void> {
    await this.transactionCoordinator.initialize(GroupIds.INVOICE_SERVICE_GROUP);
  }

  async generateInvoiceInTransaction (transactionId: string, orderId: string, userId: string, totalAmount: number): Promise<Invoice> {
    const invoiceData = {
      orderId,
      userId,
      status: InvoiceStatus.PAID,
      title: `Invoice for Order #${orderId}`,
      description: 'Invoice generated for completed order.',
      pdfUrl: 'some pdf file could be generated for that in the future...'
    };

    const invoice = this.invoiceRepository.create({ ...invoiceData, amount: totalAmount });
    const savedInvoice = await this.invoiceRepository.save(invoice);
    const singleInvoice = Array.isArray(savedInvoice) ? savedInvoice[0] : savedInvoice;

    LoggerTracerInfrastructure.log(`Invoice generated with ID: ${singleInvoice.id} in transaction ${transactionId}`);

    return singleInvoice;
  }

  async compensateInvoice (transactionId: string, orderId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { orderId } });

    if (invoice) {
      await this.invoiceRepository.save({ ...invoice, status: InvoiceStatus.CANCELLED });
      LoggerTracerInfrastructure.log(`Cancelled invoice for order ${orderId} in transaction ${transactionId}`);
    } else {
      LoggerTracerInfrastructure.log(`No invoice found for order ${orderId} in transaction ${transactionId}`);
    }
  }
}
