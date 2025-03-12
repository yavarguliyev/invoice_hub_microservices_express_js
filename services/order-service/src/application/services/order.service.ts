import { Container } from 'typedi';
import { plainToInstance } from 'class-transformer';
import {
  CreateOrderArgs,
  GenerateInvoiceArgs,
  GetQueryResultsArgs,
  GroupIds,
  InvoiceStatus,
  KafkaInfrastructure,
  OrderApproveOrCancelArgs,
  OrderDto,
  OrderStatus,
  queryResults,
  redisCacheConfig,
  RedisDecorator,
  ResponseResults,
  ResultMessage,
  Subjects,
  UserDto,
  GetOrderArgs,
  EventPublisherDecorator,
  eventPublisherConfig
} from '@invoice-hub/common';

import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { OrderRepository } from 'domain/repositories/order.repository';
import { Order } from 'domain/entities/order.entity';

export interface IOrderService {
  initialize (): Promise<void>;
  get (query: GetQueryResultsArgs): Promise<ResponseResults<OrderDto>>;
  getById (args: GetOrderArgs): Promise<ResponseResults<OrderDto>>;
  getBy (message: string): Promise<OrderDto>;
  createOrder(currentUser: UserDto, args: CreateOrderArgs): Promise<ResponseResults<OrderDto>>;
  approveOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
  cancelOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
}

export class OrderService implements IOrderService {
  private orderRepository: OrderRepository;
  private kafka: KafkaInfrastructure;

  constructor () {
    this.orderRepository = Container.get(OrderRepository);
    this.kafka = Container.get(KafkaInfrastructure);
  }

  async initialize () {
    await this.kafka.subscribe({
      topicName: Subjects.FETCH_ORDER_REQUEST, handler: this.getBy.bind(this), options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
    });
  }

  @RedisDecorator<OrderDto>(redisCacheConfig.ORDER_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.orderRepository, query, dtoClass: OrderDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async getById (args: GetOrderArgs) {
    const order = await this.orderRepository.findOneByOrFail({ id: args.id });

    const orderDto = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });
    const options = buildKafkaRequestOptionsHelper(order);

    const [userResponse] = await this.kafka.requestResponse(options);

    const user = JSON.parse(userResponse);
    const payload = { ...orderDto, user };

    return { payload, result: ResultMessage.SUCCESS };
  }

  @EventPublisherDecorator(eventPublisherConfig.ORDER_GET_BY)
  async getBy (message: string) {
    const { message: request } = JSON.parse(message);
    const { orderId } = JSON.parse(request);

    const order = await this.orderRepository.findOneByOrFail({ id: orderId });
    const orderDto = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });

    return orderDto;
  }

  async createOrder ({ id }: UserDto, args: CreateOrderArgs) {
    const order = this.orderRepository.create({ ...args, userId: id, status: OrderStatus.PENDING });
    const newOrder = await this.orderRepository.save(order);
    const payload = plainToInstance(OrderDto, newOrder, { excludeExtraneousValues: true });

    return { payload, result: ResultMessage.SUCCESS };
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
    await this.handleInvoiceGeneration(args, order);

    const payload = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });

    return { payload, result: ResultMessage.SUCCESS };
  }

  @EventPublisherDecorator(eventPublisherConfig.ORDER_INVOICE_GENERATE)
  private async handleInvoiceGeneration (args: OrderApproveOrCancelArgs, order: Order) {
    return { ...args, totalAmount: order.totalAmount, userId: order.userId } as GenerateInvoiceArgs;
  }
}
