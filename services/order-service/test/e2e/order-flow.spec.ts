import { Container } from 'typedi';
import { DeepPartial } from 'typeorm';
import {
  ContainerHelper,
  ContainerItems,
  CreateOrderArgs,
  OrderStatus,
  InvoiceStatus,
  UserDto,
  KafkaInfrastructure,
  RedisInfrastructure,
  Roles
} from '@invoice-hub/common';

import { OrderService } from '../../src/application/services/order.service';
import { OrderRepository } from '../../src/domain/repositories/order.repository';
import { Order } from '../../src/domain/entities/order.entity';

describe('Order Flow (E2E)', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<Pick<OrderRepository, 'find' | 'findOne' | 'findOneOrFail' | 'create' | 'save'>>;
  let mockKafka: jest.Mocked<Pick<KafkaInfrastructure, 'subscribe' | 'requestResponse' | 'publish'>>;

  beforeAll(async () => { });

  afterAll(async () => { });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockOrderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    mockKafka = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      requestResponse: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined)
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      getHashKeys: jest.fn().mockResolvedValue([]),
      deleteKeys: jest.fn().mockResolvedValue(true),
      setHashKeys: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(Container, 'get').mockImplementation((token) => {
      if (token === OrderRepository) {
        return mockOrderRepository;
      }

      if (token === KafkaInfrastructure) {
        return mockKafka;
      }

      if (token === RedisInfrastructure) {
        return mockRedis;
      }

      return {};
    });

    orderService = new OrderService();

    jest.spyOn(ContainerHelper, 'get').mockImplementation((token) => {
      if (token === ContainerItems.IOrderService) {
        return orderService;
      }

      return {};
    });
  });

  it('should handle full order lifecycle', async () => {
    const userData: UserDto = {
      id: 'user-1',
      role: {
        name: Roles.Standard
      }
    };

    const createOrderArgs: CreateOrderArgs = {
      totalAmount: 150
    };

    const mockOrder: DeepPartial<Order> = {
      id: 'order-1',
      totalAmount: 150,
      status: OrderStatus.PENDING,
      userId: 'user-1'
    };

    mockOrderRepository.create.mockReturnValue(mockOrder as Order);
    mockOrderRepository.save.mockResolvedValue(mockOrder as Order);
    mockOrderRepository.find.mockResolvedValue([mockOrder as Order]);
    mockOrderRepository.findOneOrFail.mockResolvedValue(mockOrder as Order);

    const createResult = await orderService.createOrder(userData, createOrderArgs);

    expect(createResult.payload).toBeDefined();
    expect(createResult.payload.id).toBe(mockOrder.id);
    expect(createResult.payload.status).toBe(OrderStatus.PENDING);
    expect(mockOrderRepository.create).toHaveBeenCalledWith({
      totalAmount: createOrderArgs.totalAmount,
      userId: userData.id,
      status: OrderStatus.PENDING
    });

    jest.spyOn(orderService as any, 'handleInvoiceGeneration').mockResolvedValue({
      orderId: mockOrder.id,
      userId: mockOrder.userId,
      totalAmount: mockOrder.totalAmount,
      newOrderStatus: OrderStatus.COMPLETED,
      newInvoiceStatus: InvoiceStatus.PAID
    });

    const approvedOrder = {
      ...mockOrder,
      status: OrderStatus.COMPLETED
    };
    mockOrderRepository.save.mockResolvedValueOnce(approvedOrder as Order);

    const approveResult = await orderService.approveOrder(mockOrder.id as string);

    expect(approveResult.payload).toBeDefined();
    expect(approveResult.payload.status).toBe(OrderStatus.COMPLETED);
    expect(mockOrderRepository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: mockOrder.id, status: OrderStatus.PENDING }
    });

    jest.spyOn(orderService as any, 'kafka', 'get').mockReturnValue({
      requestResponse: jest.fn().mockResolvedValue([
        JSON.stringify({
          id: 'user-1',
          role: {
            name: Roles.Standard
          }
        })
      ]),
      publish: jest.fn().mockResolvedValue(undefined)
    });

    jest.spyOn(orderService as any, 'orderDtoLoaderById', 'get').mockReturnValue({
      load: jest.fn().mockResolvedValue({
        id: mockOrder.id,
        totalAmount: mockOrder.totalAmount,
        status: OrderStatus.COMPLETED,
        userId: mockOrder.userId
      })
    });

    const getResult = await orderService.getById({ id: mockOrder.id as string });

    expect(getResult.payload).toBeDefined();
    expect(getResult.payload.id).toBe(mockOrder.id);
    expect(getResult.payload.user).toBeDefined();
    expect(getResult.payload.user.id).toBe(userData.id);

    const anotherOrder: DeepPartial<Order> = {
      id: 'order-2',
      totalAmount: 200,
      status: OrderStatus.PENDING,
      userId: 'user-1'
    };

    mockOrderRepository.create.mockReturnValueOnce(anotherOrder as Order);
    mockOrderRepository.save.mockResolvedValueOnce(anotherOrder as Order);
    mockOrderRepository.findOneOrFail.mockResolvedValueOnce(anotherOrder as Order);

    await orderService.createOrder(userData, { totalAmount: 200 });

    jest.spyOn(orderService as any, 'handleInvoiceGeneration').mockResolvedValue({
      orderId: anotherOrder.id,
      userId: anotherOrder.userId,
      totalAmount: anotherOrder.totalAmount,
      newOrderStatus: OrderStatus.CANCELLED,
      newInvoiceStatus: InvoiceStatus.CANCELLED
    });

    const cancelledOrder = {
      ...anotherOrder,
      status: OrderStatus.CANCELLED
    };
    mockOrderRepository.save.mockResolvedValueOnce(cancelledOrder as Order);

    const cancelResult = await orderService.cancelOrder(anotherOrder.id as string);

    expect(cancelResult.payload).toBeDefined();
    expect(cancelResult.payload.status).toBe(OrderStatus.CANCELLED);
  });
});
