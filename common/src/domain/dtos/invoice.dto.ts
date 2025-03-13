import { Expose } from 'class-transformer';

import { InvoiceStatus } from '../enums/invoice-status.enum';

export class InvoiceDto {
  @Expose()
  id: string;

  @Expose()
  orderId?: string;

  @Expose()
  userId?: string;

  @Expose()
  title: string;

  @Expose()
  amount: number;

  @Expose()
  description: string;

  @Expose()
  status: InvoiceStatus;
}
