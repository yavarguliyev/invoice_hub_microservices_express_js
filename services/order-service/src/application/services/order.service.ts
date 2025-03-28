import { Container } from 'typedi';
import DataLoader from 'dataloader';
import { plainToInstance } from 'class-transformer';
import {
  CreateOrderArgs,
  GenerateInvoiceArgs,
  GetQueryResultsArgs,
  GroupIds,
  InvoiceStatus,
  KafkaInfrastructure,
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
  eventPublisherConfig,
  DataLoaderInfrastructure,
  ContainerKeys,
  RedisCacheInvalidateDecorator,
  TransactionCoordinatorInfrastructure,
  ClientIds,
  ProcessType,
  OrderApprovalProcessOptions
} from '@invoice-hub/common';

import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { OrderRepository } from 'domain/repositories/order.repository';
import { Order } from 'domain/entities/order.entity';

export interface IOrderService {
  initialize(): Promise<void>;
  get(query: GetQueryResultsArgs): Promise<ResponseResults<OrderDto>>;
  getById(args: GetOrderArgs): Promise<ResponseResults<OrderDto>>;
  getBy(message: string): Promise<void>;
  createOrder(currentUser: UserDto, args: CreateOrderArgs): Promise<ResponseResults<OrderDto>>;
  approveOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
  cancelOrder(orderId: string): Promise<ResponseResults<OrderDto>>;
  revertOrderStatus(orderId: string): Promise<ResponseResults<OrderDto>>;
}

export class OrderService implements IOrderService {
  private _transactionCoordinator?: TransactionCoordinatorInfrastructure;
  private _orderRepository?: OrderRepository;
  private _kafka?: KafkaInfrastructure;
  private _orderDtoLoaderById?: DataLoader<string, OrderDto>;

  private get transactionCoordinator () {
    if (!this._transactionCoordinator) {
      this._transactionCoordinator = Container.get(TransactionCoordinatorInfrastructure);
    }

    return this._transactionCoordinator;
  }

  private get orderRepository () {
    if (!this._orderRepository) {
      this._orderRepository = Container.get(OrderRepository);
    }

    return this._orderRepository;
  }

  private get kafka () {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }

    return this._kafka;
  }

  private get orderDtoLoaderById () {
    if (!this._orderDtoLoaderById) {
      this._orderDtoLoaderById = Container.get<DataLoaderInfrastructure<Order>>(ContainerKeys.ORDER_DATA_LOADER)
        .getDataLoader({ entity: Order, Dto: OrderDto, fetchField: 'id' });
    }

    return this._orderDtoLoaderById;
  }

  async initialize () {
    await Promise.all([
      this.kafka.subscribe({
        topicName: Subjects.FETCH_ORDER_REQUEST,
        handler: this.handleOrderFetchRequest.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_PROCESS_START,
        handler: this.handleOrderApprovalProcessStart.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS,
        handler: this.handleOrderStatusUpdate.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS,
        handler: this.handleOrderStatusCompensation.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      }),
      this.kafka.subscribe({
        topicName: Subjects.INVOICE_GENERATION_FAILED,
        handler: this.handleInvoiceGenerationFailure.bind(this),
        options: { groupId: GroupIds.ORDER_SERVICE_GROUP }
      })
    ]);
  }

  @RedisDecorator(redisCacheConfig.ORDER_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.orderRepository, query, dtoClass: OrderDto });

    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async getById (args: GetOrderArgs) {
    const orderDto = await this.ensureUserIdInOrder(args.id);

    const options = buildKafkaRequestOptionsHelper(orderDto);
    const [userResponse] = await this.kafka.requestResponse(options);
    const user = JSON.parse(userResponse);
    delete orderDto.userId;

    return { payload: { ...orderDto, user }, result: ResultMessage.SUCCESS };
  }

  private async handleOrderFetchRequest (message: string): Promise<void> {
    await this.publishOrderDetails(message);
  }

  @EventPublisherDecorator(eventPublisherConfig.ORDER_GET_BY)
  private async publishOrderDetails (message: string): Promise<unknown> {
    const { message: request } = JSON.parse(message);
    const { orderId } = JSON.parse(request);

    await this.orderDtoLoaderById.load(orderId);
    return orderId;
  }

  private async handleOrderApprovalProcessStart (messageStr: string): Promise<void> {
    const options = JSON.parse(messageStr) as OrderApprovalProcessOptions;

    const steps = [
      { name: Subjects.UPDATE_ORDER_STATUS, service: ClientIds.ORDER_SERVICE },
      { name: Subjects.INVOICE_GENERATE, service: ClientIds.INVOICE_SERVICE }
    ];

    await this.transactionCoordinator.startTransaction({
      processType: ProcessType.ORDER_APPROVAL,
      steps,
      payload: options as unknown as Record<string, unknown>,
      initiatedBy: options.userId || 'system'
    });
  }

  private async handleOrderStatusUpdate (messageStr: string): Promise<void> {
    await this.publishOrderStatusUpdate(messageStr);
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_STEP_COMPLETED)
  private async publishOrderStatusUpdate (messageStr: string): Promise<unknown> {
    const { transactionId, orderId } = JSON.parse(messageStr);
    const result = await this.approveOrder(orderId);

    if (result.result !== ResultMessage.SUCCESS) {
      return {
        transactionId,
        stepName: Subjects.UPDATE_ORDER_STATUS,
        error: ResultMessage.FAILED_ORDER_UPDATE_STATUS
      };
    }

    return {
      transactionId,
      orderId,
      orderStatus: OrderStatus.COMPLETED
    };
  }

  private async handleOrderStatusCompensation (messageStr: string): Promise<void> {
    await this.publishOrderStatusCompensation(messageStr);
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_COMPENSATION_COMPLETED)
  private async publishOrderStatusCompensation (messageStr: string): Promise<unknown> {
    const { transactionId, orderId } = JSON.parse(messageStr);
    await this.revertOrderStatus(orderId);

    return { transactionId };
  }

  private async handleInvoiceGenerationFailure (messageStr: string): Promise<void> {
    await this.publishInvoiceGenerationFailure(messageStr);
  }

  @EventPublisherDecorator(eventPublisherConfig.TRANSACTION_STEP_FAILED)
  private async publishInvoiceGenerationFailure (messageStr: string): Promise<unknown | void> {
    const parsedMessage = JSON.parse(messageStr);
    const { transactionId, orderId } = parsedMessage;

    if (!transactionId && orderId) {
      await this.revertOrderStatus(orderId);
      return;
    }

    return {
      transactionId,
      stepName: Subjects.INVOICE_GENERATE,
      error: ResultMessage.FAILED_INVOICE_GENERATION
    };
  }

  @RedisCacheInvalidateDecorator(redisCacheConfig.ORDER_LIST)
  async createOrder ({ id }: UserDto, args: CreateOrderArgs) {
    const order = this.orderRepository.create({ ...args, userId: id, status: OrderStatus.PENDING });
    const newOrder = await this.orderRepository.save(order);
    const payload = plainToInstance(OrderDto, newOrder, { excludeExtraneousValues: true });

    return { payload, result: ResultMessage.SUCCESS };
  }

  async approveOrder (orderId: string) {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId, status: OrderStatus.PENDING } });
    order.status = OrderStatus.COMPLETED;
    await this.orderRepository.save(order);

    const invoiceArgs = {
      orderId,
      totalAmount: order.totalAmount,
      userId: order.userId,
      newOrderStatus: OrderStatus.COMPLETED,
      newInvoiceStatus: InvoiceStatus.PAID
    } as GenerateInvoiceArgs;

    await this.kafka.publish({
      topicName: Subjects.INVOICE_GENERATE,
      message: JSON.stringify(invoiceArgs)
    });

    const payload = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });
    return { payload, result: ResultMessage.SUCCESS };
  }

  @EventPublisherDecorator(eventPublisherConfig.ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS)
  async cancelOrder (orderId: string) {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId, status: OrderStatus.PENDING } });
    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    const payload = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });
    return { payload, result: ResultMessage.SUCCESS };
  }

  async revertOrderStatus (orderId: string): Promise<ResponseResults<OrderDto>> {
    const order = await this.orderRepository.findOneOrFail({ where: { id: orderId, status: OrderStatus.COMPLETED } });
    order.status = OrderStatus.PENDING;
    await this.orderRepository.save(order);

    const payload = plainToInstance(OrderDto, order, { excludeExtraneousValues: true });
    return { payload, result: ResultMessage.SUCCESS };
  }

  private async ensureUserIdInOrder (id: string): Promise<OrderDto> {
    const orderDto = await this.orderDtoLoaderById.load(id);

    if (!orderDto.userId) {
      this.orderDtoLoaderById.clear(id);
      return await this.ensureUserIdInOrder(id);
    }

    return orderDto;
  }

  async getBy (message: string): Promise<void> {
    await this.publishOrderDetails(message);
  }
}
