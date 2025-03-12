import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

import { OrderStatus } from '../../domain/enums/order-status.enum';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';


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
