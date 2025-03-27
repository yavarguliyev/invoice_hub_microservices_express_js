import { Container } from 'typedi';
import { DeepPartial } from 'typeorm';
import {
  ContainerHelper,
  ContainerItems,
  GetQueryResultsArgs,
  OrderDto,
  OrderStatus,
  CreateOrderArgs,
  ResultMessage,
  UserDto,
  Roles
} from '@invoice-hub/common';

import { OrdersController } from '../../src/api/v1/orders.controller';
import { IOrderService } from '../../src/application/services/order.service';
import { Order } from '../../src/domain/entities/order.entity';

describe('OrdersController Integration Tests', () => {
  let ordersController: OrdersController;
  let mockOrderService: jest.Mocked<Pick<IOrderService, 'get' | 'getById' | 'createOrder' | 'approveOrder' | 'cancelOrder'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderService = {
      get: jest.fn(),
      getById: jest.fn(),
      createOrder: jest.fn(),
      approveOrder: jest.fn(),
      cancelOrder: jest.fn()
    };

    jest.spyOn(ContainerHelper, 'get').mockImplementation((token) => {
      if (token === ContainerItems.IOrderService) {
        return mockOrderService;
      }
      return {};
    });

    ordersController = new OrdersController();
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

      const expectedResponse = {
        payloads: mockOrders.map(order => ({
          id: order.id,
          totalAmount: order.totalAmount,
          status: order.status,
          userId: order.userId
        })) as OrderDto[],
        total: 2,
        result: ResultMessage.SUCCESS
      };

      mockOrderService.get.mockResolvedValue(expectedResponse);

      const query: GetQueryResultsArgs = { page: 1, limit: 10, filters: {}, order: {} };
      const result = await ordersController.get(query);

      expect(result).toEqual(expectedResponse);
      expect(mockOrderService.get).toHaveBeenCalledWith(query);
    });
  });

  describe('getById', () => {
    it('should return an order by id with user details', async () => {
      const mockOrder: OrderDto = {
        id: '1',
        totalAmount: 100,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      const mockUser = {
        id: 'user-1',
        role: {
          name: Roles.Standard
        }
      };

      const expectedResponse = {
        payload: {
          ...mockOrder,
          user: mockUser
        },
        result: ResultMessage.SUCCESS
      };

      mockOrderService.getById.mockResolvedValue(expectedResponse);

      const result = await ordersController.getById({ id: '1' });

      expect(result).toEqual(expectedResponse);
      expect(mockOrderService.getById).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const userData: UserDto = {
        id: 'user-1',
        role: {
          name: Roles.Standard
        }
      };

      const createOrderArgs: CreateOrderArgs = {
        totalAmount: 150
      };

      const mockOrder: OrderDto = {
        id: '1',
        totalAmount: 150,
        status: OrderStatus.PENDING,
        userId: 'user-1'
      };

      const expectedResponse = {
        payload: mockOrder,
        result: ResultMessage.SUCCESS
      };

      mockOrderService.createOrder.mockResolvedValue(expectedResponse);

      const result = await ordersController.createOrder(userData, createOrderArgs);

      expect(result).toEqual(expectedResponse);
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(userData, createOrderArgs);
    });
  });

  describe('approveOrder', () => {
    it('should approve an order', async () => {
      const orderId = 'order-1';
      const mockOrder: OrderDto = {
        id: orderId,
        totalAmount: 100,
        status: OrderStatus.COMPLETED,
        userId: 'user-1'
      };

      const expectedResponse = {
        payload: mockOrder,
        result: ResultMessage.SUCCESS
      };

      mockOrderService.approveOrder.mockResolvedValue(expectedResponse);

      const result = await ordersController.approveOrder(orderId);

      expect(result).toEqual(expectedResponse);
      expect(mockOrderService.approveOrder).toHaveBeenCalledWith(orderId);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const orderId = 'order-1';
      const mockOrder: OrderDto = {
        id: orderId,
        totalAmount: 100,
        status: OrderStatus.CANCELLED,
        userId: 'user-1'
      };

      const expectedResponse = {
        payload: mockOrder,
        result: ResultMessage.SUCCESS
      };

      mockOrderService.cancelOrder.mockResolvedValue(expectedResponse);

      const result = await ordersController.cancelOrder(orderId);

      expect(result).toEqual(expectedResponse);
      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith(orderId);
    });
  });
}); 