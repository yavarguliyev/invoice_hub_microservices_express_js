import { Container } from 'typedi';
import { GetQueryResultsArgs, KafkaInfrastructure, LoggerTracerInfrastructure, queryResults, ResponseResults, ResultMessage } from '@invoice-hub/common';

import { OrderDto } from 'domain/dto/order.dto';
import { OrderRepository } from 'domain/repositories/order.repository';

export interface IOrderService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<OrderDto>>;
  handleOrderCreated (message: string): Promise<any>;
}

export class OrderService implements IOrderService {
  private orderRepository: OrderRepository;

  constructor () {
    this.orderRepository = Container.get(OrderRepository);
  }

  async initialize () {
    await KafkaInfrastructure.subscribe('order-created', this.handleOrderCreated.bind(this), { groupId: 'order-service-group' });
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.orderRepository, query, dtoClass: OrderDto });

    return { payloads, total, result: ResultMessage.SUCCEED };
  }

  async handleOrderCreated (message: string) {
    const { orderId, order } = JSON.parse(message);
    await KafkaInfrastructure.publish('invoice-generate', JSON.stringify({ orderId, order }));

    LoggerTracerInfrastructure.log(`Order Id: ${orderId} generated for generating invoice for the order: ${JSON.stringify({ order })}...`);
  }
}
