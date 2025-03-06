import { Expose } from 'class-transformer';

import { OrderStatus } from '../enums/order-status.enum';

export class OrderDto {
  @Expose()
  id: string;

  @Expose()
  totalAmount: number;

  @Expose()
  status: OrderStatus;
}
