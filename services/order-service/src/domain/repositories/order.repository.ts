import { Repository, EntityRepository } from 'typeorm';

import { Order } from 'domain/entities/order.entity';

@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {};
