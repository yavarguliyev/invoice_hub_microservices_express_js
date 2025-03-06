import { Container } from 'typedi';
import {
  GetQueryResultsArgs, GroupIds, KafkaInfrastructure, LoggerTracerInfrastructure, OrderDto, queryResults, ResponseResults, ResultMessage, Subjects
} from '@invoice-hub/common';

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
    await KafkaInfrastructure.subscribe(Subjects.ORDER_CREATED, this.handleOrderCreated.bind(this), { groupId: GroupIds.ORDER_SERVICE_GROUP });
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.orderRepository, query, dtoClass: OrderDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async handleOrderCreated (message: string) {
    const { orderId, order } = JSON.parse(message);
    await KafkaInfrastructure.publish(Subjects.INVOICE_GENERATE, JSON.stringify({ orderId, order }));

    LoggerTracerInfrastructure.log(`Order Id: ${orderId} generated for generating invoice for the order: ${JSON.stringify({ order })}...`);
  }
}
