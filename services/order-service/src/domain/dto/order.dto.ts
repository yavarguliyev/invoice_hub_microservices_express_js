import { Expose } from 'class-transformer';
import { OrderStatus } from '@invoice-hub/common';

export class OrderDto {
  @Expose()
  id: number;

  @Expose()
  totalAmount: number;

  @Expose()
  status: OrderStatus;
}
