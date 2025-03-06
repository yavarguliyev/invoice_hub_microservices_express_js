import { IsEnum, IsNumber } from 'class-validator';

import { OrderStatus } from '../../domain/enums/order-status.enum';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';

export class OrderApproveOrCancelArgs {
  @IsNumber()
  orderId: string;

  @IsEnum(OrderStatus)
  newOrderStatus: OrderStatus;

  @IsEnum(InvoiceStatus)
  newInvoiceStatus: InvoiceStatus;
}
