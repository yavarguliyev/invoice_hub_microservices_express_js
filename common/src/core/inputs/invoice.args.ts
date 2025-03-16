import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

import { InvoiceStatus, OrderStatus } from '../../domain/enums/status.enum';

export class GetInvoiceArgs {
  @Expose()
  @IsString()
  public id: string;
}

export class GenerateInvoiceArgs {
  @IsNumber()
  userId: string;

  @IsNumber()
  orderId: string;

  @IsEnum(OrderStatus)
  newOrderStatus: OrderStatus;

  @IsEnum(InvoiceStatus)
  newInvoiceStatus: InvoiceStatus;

  @IsNumber()
  totalAmount: number;
}

export class CreateInvoiceArgs {
  @Expose()
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @Expose()
  userId: string;

  @Expose()
  orderId: string;
}
