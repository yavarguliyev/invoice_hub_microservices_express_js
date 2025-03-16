import { Expose } from 'class-transformer';

import { OrderStatus } from '../../domain/enums/status.enum';

export class OrderDto {
  @Expose()
  id: string;

  @Expose()
  userId?: string;

  @Expose()
  totalAmount: number;

  @Expose()
  status: OrderStatus;
}
