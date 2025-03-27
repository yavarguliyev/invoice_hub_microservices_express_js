import { Container } from 'typedi';
import { DeepPartial } from 'typeorm';
import DataLoader from 'dataloader';
import {
  GetQueryResultsArgs,
  OrderDto,
  KafkaInfrastructure,
  OrderStatus,
  CreateOrderArgs,
  ResultMessage,
  ContainerKeys,
  UserDto,
  RedisInfrastructure,
  Roles
} from '@invoice-hub/common';

import { OrderService } from '../../src/application/services/order.service';
import { OrderRepository } from '../../src/domain/repositories/order.repository';
import { Order } from '../../src/domain/entities/order.entity';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<Pick<OrderRepository, 'find' | 'findOne' | 'findOneOrFail' | 'create' | 'save' | 'createQueryBuilder'>>;
  let mockKafka: jest.Mocked<Pick<KafkaInfrastructure, 'subscribe' | 'requestResponse' | 'publish'>>;
  let mockDataLoader: DataLoader<string, OrderDto>;
  let mockDataLoaderInfrastructure: any;
  let mockRedis: jest.Mocked<Pick<RedisInfrastructure, 'get' | 'set' | 'getHashKeys' | 'deleteKeys' | 'setHashKeys'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0])
      })
    };

    mockKafka = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      requestResponse: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined)
    };

    mockDataLoader = {
      load: jest.fn(),
      loadMany: jest.fn(),
      clear: jest.fn(),
      clearAll: jest.fn(),
      prime: jest.fn(),
      name: null
    } as any;

    mockDataLoaderInfrastructure = {
      getDataLoader: jest.fn().mockReturnValue(mockDataLoader)
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      getHashKeys: jest.fn().mockResolvedValue([]),
      deleteKeys: jest.fn().mockResolvedValue(true),
      setHashKeys: jest.fn().mockResolvedValue(true)
    };

    // Reset any existing mocks
    jest.restoreAllMocks();

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
      if (String(token) === String(ContainerKeys.ORDER_DATA_LOADER)) {
        return mockDataLoaderInfrastructure;
      }
      return {};
    });

    orderService = new OrderService();
  });

  describe('initialize', () => {
    it('should subscribe to the FETCH_ORDER_REQUEST topic', async () => {
      await orderService.initialize();

      expect(mockKafka.subscribe).toHaveBeenCalledTimes(1);
      expect(mockKafka.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          topicName: 'fetch-order-request'
        })
      );
    });
  });

  describe('get', () => {
    it('should return list of orders', async () => {
      const mockOrders: DeepPartial<Order>[] = [
        {
          id: '1',
          totalAmount: 100,
          status: OrderStatus.PENDING,
          userId: 'user-1'
        },
        {
          id: '2',
          totalAmount: 200,
          status: OrderStatus.COMPLETED,
          userId: 'user-2'
        }
      ];

      // Update mock for this specific test
      mockOrderRepository.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrders, mockOrders.length])
      });

      const query: GetQueryResultsArgs = { page: 1, limit: 10, filters: {}, order: {} };
      const result = await orderService.get(query);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payloads).toHaveLength(2);
      expect(mockOrderRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return order with related user', async () => {
      const mockOrderDto: OrderDto = {
        id: '1',
        totalAmount: 100,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      const mockUser = { id: 'user-1', name: 'John Doe' };

      (mockDataLoader.load as jest.Mock).mockResolvedValue(mockOrderDto);
      mockKafka.requestResponse.mockResolvedValue([
        JSON.stringify(mockUser)
      ]);

      const result = await orderService.getById({ id: '1' });

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payload).toHaveProperty('id', '1');
      expect(result.payload).toHaveProperty('user');
      expect(result.payload.user).toEqual(mockUser);
      expect(mockDataLoader.load).toHaveBeenCalledWith('1');
      expect(mockKafka.requestResponse).toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    it('should create a new order with PENDING status', async () => {
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
        id: '1',
        totalAmount: 150,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      mockOrderRepository.create.mockReturnValue(mockOrder as Order);
      mockOrderRepository.save.mockResolvedValue(mockOrder as Order);

      const result = await orderService.createOrder(userData, createOrderArgs);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payload).toHaveProperty('id', '1');
      expect(result.payload).toHaveProperty('status', OrderStatus.PENDING);
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        totalAmount: createOrderArgs.totalAmount,
        userId: userData.id,
        status: OrderStatus.PENDING
      });
      expect(mockOrderRepository.save).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('approveOrder', () => {
    it('should approve an order and change its status to COMPLETED', async () => {
      const orderId = 'order-1';
      const mockOrder: DeepPartial<Order> = {
        id: orderId,
        totalAmount: 100,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      mockOrderRepository.findOneOrFail.mockResolvedValue(mockOrder as Order);
      mockOrderRepository.save.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.COMPLETED
      } as Order);

      const result = await orderService.approveOrder(mockOrder.id as string);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payload).toHaveProperty('status', OrderStatus.COMPLETED);
      expect(mockOrderRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: mockOrder.id, status: OrderStatus.PENDING }
      });
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order and change its status to CANCELLED', async () => {
      const orderId = 'order-1';
      const mockOrder: DeepPartial<Order> = {
        id: orderId,
        totalAmount: 100,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      mockOrderRepository.findOneOrFail.mockResolvedValue(mockOrder as Order);
      mockOrderRepository.save.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.CANCELLED
      } as Order);

      const result = await orderService.cancelOrder(mockOrder.id as string);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payload).toHaveProperty('status', OrderStatus.CANCELLED);
      expect(mockOrderRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: mockOrder.id, status: OrderStatus.PENDING }
      });
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });
  });

  describe('getBy', () => {
    it('should return order by id from message', async () => {
      const mockOrderDto: OrderDto = {
        id: 'order-1',
        totalAmount: 100,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      const message = JSON.stringify({
        message: JSON.stringify({
          orderId: 'order-1'
        })
      });

      (mockDataLoader.load as jest.Mock).mockResolvedValue(mockOrderDto);

      const result = await orderService.getBy(message);

      expect(result).toEqual(mockOrderDto);
      expect(mockDataLoader.load).toHaveBeenCalledWith('order-1');
    });
  });
});
