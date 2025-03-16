import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

import { InvoiceStatus, OrderStatus } from '../../domain/enums/status.enum';


export class GetOrderArgs {
  @Expose()
  @IsString()
  public id: string;
}

export class CreateOrderArgs {
  @Expose()
  @IsNumber()
  totalAmount: number;
}

export class OrderApproveOrCancelArgs {
  @IsNumber()
  orderId: string;

  @IsEnum(OrderStatus)
  newOrderStatus: OrderStatus;

  @IsEnum(InvoiceStatus)
  newInvoiceStatus: InvoiceStatus;
}
