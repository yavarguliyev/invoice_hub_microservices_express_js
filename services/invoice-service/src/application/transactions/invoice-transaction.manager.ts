import { Container } from 'typedi';
import { TransactionCoordinatorInfrastructure, InvoiceStatus, GroupIds, LoggerTracerInfrastructure, getErrorMessage } from '@invoice-hub/common';

import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceTransactionManager {
  initialize(): Promise<void>;
  generateInvoiceInTransaction(orderId: string, userId: string, totalAmount: number): Promise<Invoice>;
  handleCompensation(transactionId: string): Promise<void>;
}

export class InvoiceTransactionManager implements IInvoiceTransactionManager {
  // #region DI
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
  // #endregion

  async initialize (): Promise<void> {
    await this.transactionCoordinator.initialize(GroupIds.INVOICE_SERVICE_TRANSACTION_GROUP);
  }

  async generateInvoiceInTransaction (orderId: string, userId: string, totalAmount: number): Promise<Invoice> {
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

    return singleInvoice;
  }

  async handleCompensation (transactionId: string): Promise<void> {
    try {
      const transaction = await this.transactionCoordinator.getTransactionState(transactionId);
      if (!transaction) {
        LoggerTracerInfrastructure.log(`No transaction found for compensation: ${transactionId}`);
        return;
      }

      const invoice = await this.invoiceRepository.findOne({ where: { orderId: String(transaction.payload?.orderId) } });
      if (!invoice) {
        LoggerTracerInfrastructure.log(`No invoice found for transaction: ${transactionId}`);
        return;
      }

      if (invoice.status === InvoiceStatus.PENDING || invoice.status === InvoiceStatus.CANCELLED) {
        await this.invoiceRepository.update(invoice.id, { status: InvoiceStatus.CANCELLED, updatedAt: new Date() });
      }

      LoggerTracerInfrastructure.log(`Invoice compensation completed for transaction: ${transactionId}`);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error during invoice compensation: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
