import { Expose } from 'class-transformer';
import { InvoiceStatus } from '@invoice-hub/common';

export class InvoiceDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  amount: number;

  @Expose()
  description: string;

  @Expose()
  status: InvoiceStatus;
}
