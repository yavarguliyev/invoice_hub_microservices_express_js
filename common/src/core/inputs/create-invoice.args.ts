import { IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';

import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';

export class CreateInvoiceArgs {
  @Expose()
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @Expose()
  userId: string;

  @Expose()
  orderId: string;
}
