import { Container } from 'typedi';
import {
  CreateOrderArgs,
  GenerateInvoiceArgs,
  GetQueryResultsArgs,
  InvoiceStatus,
  KafkaInfrastructure,
  OrderApproveOrCancelArgs,
  OrderDto,
  OrderStatus,
  queryResults,
  ResponseResults,
  ResultMessage,
  Subjects,
  UserDto
} from '@invoice-hub/common';

import { OrderRepository } from 'domain/repositories/order.repository';

export interface IOrderService {
  get (query: GetQueryResultsArgs): Promise<ResponseResults<OrderDto>>;
  createOrder(currentUser: UserDto, args: CreateOrderArgs): Promise<ResponseResults<OrderDto>>;
  approveOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
  cancelOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
}

export class OrderService implements IOrderService {
  private orderRepository: OrderRepository;

  constructor () {
    this.orderRepository = Container.get(OrderRepository);
  }

  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.orderRepository, query, dtoClass: OrderDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async createOrder ({ id }: UserDto, args: CreateOrderArgs) {
    const order = this.orderRepository.create({ ...args, userId: id, status: OrderStatus.PENDING });
    await this.orderRepository.save(order);

    return { result: ResultMessage.SUCCESS };
  }

  async approveOrder (orderId: string) {
    return this.processOrderApproveOrCancel({
      orderId, newOrderStatus: OrderStatus.COMPLETED, newInvoiceStatus: InvoiceStatus.PAID
    });
  }

  async cancelOrder (orderId: string) {
    return this.processOrderApproveOrCancel({
      orderId, newOrderStatus: OrderStatus.CANCELLED, newInvoiceStatus: InvoiceStatus.CANCELLED
    });
  }

  private async processOrderApproveOrCancel (args: OrderApproveOrCancelArgs) {
    const { orderId, newOrderStatus } = args;

    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId, status: OrderStatus.PENDING } });
    order.status = newOrderStatus;

    await this.orderRepository.save(order);
    const invoiceArgs = { ...args, totalAmount: order.totalAmount, userId: order.userId } as GenerateInvoiceArgs;
    await KafkaInfrastructure.publish(Subjects.INVOICE_GENERATE, JSON.stringify(invoiceArgs));

    return { result: ResultMessage.SUCCESS };
  }
}
