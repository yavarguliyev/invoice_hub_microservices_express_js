import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IInvoiceService } from 'application/services/invoice.service';

export abstract class BaseController {
  private _invoiceService: IInvoiceService;

  protected get invoiceService (): IInvoiceService {
    if (!this._invoiceService) {
      this._invoiceService = ContainerHelper.get<IInvoiceService>(ContainerItems.IInvoiceService);
    }

    return this._invoiceService;
  }
}
