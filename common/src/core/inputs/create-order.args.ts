import { IsNumber } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateOrderArgs {
  @Expose()
  @IsNumber()
  totalAmount: number;
}
