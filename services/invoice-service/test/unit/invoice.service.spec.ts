import { Container } from 'typedi';
import { DeepPartial } from 'typeorm';
import DataLoader from 'dataloader';
import {
  GetQueryResultsArgs,
  InvoiceDto,
  KafkaInfrastructure,
  InvoiceStatus,
  GenerateInvoiceArgs,
  ResultMessage,
  DataLoaderInfrastructure,
  OrderStatus,
  RedisInfrastructure,
  ContainerKeys
} from '@invoice-hub/common';

import { InvoiceService } from '../../src/application/services/invoice.service';
import { InvoiceRepository } from '../../src/domain/repositories/invoice.repository';
import { Invoice } from '../../src/domain/entities/invoice.entity';

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<Pick<InvoiceRepository, 'find' | 'findOne' | 'create' | 'save' | 'createQueryBuilder'>>;
  let mockKafka: jest.Mocked<Pick<KafkaInfrastructure, 'subscribe' | 'requestResponse'>>;
  let mockDataLoader: jest.Mocked<DataLoader<string, InvoiceDto>>;
  let mockDataLoaderInfrastructure: jest.Mocked<Pick<DataLoaderInfrastructure<Invoice>, 'getDataLoader'>>;
  let mockRedis: jest.Mocked<Pick<RedisInfrastructure, 'get' | 'set' | 'getHashKeys' | 'deleteKeys' | 'setHashKeys'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvoiceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[],0])
      })
    };

    mockKafka = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      requestResponse: jest.fn()
    };

    mockDataLoader = {
      load: jest.fn(),
      loadMany: jest.fn(),
      clear: jest.fn(),
      clearAll: jest.fn(),
      prime: jest.fn(),
      name: null
    };

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

    jest.restoreAllMocks();
    
    const mockRedisInstance = mockRedis;
    jest.spyOn(Container, 'get').mockImplementation((token) => {
      if (token === InvoiceRepository) {
        return mockInvoiceRepository;
      }

      if (token === KafkaInfrastructure) {
        return mockKafka;
      }

      if (token === RedisInfrastructure) {
        return mockRedisInstance;
      }

      if (String(token) === String(ContainerKeys.INVOICE_DATA_LOADER)) {
        return mockDataLoaderInfrastructure;
      }

      return {};
    });

    invoiceService = new InvoiceService();
  });

  describe('initialize', () => {
    it('should subscribe to the INVOICE_GENERATE topic', async () => {
      await invoiceService.initialize();
      
      expect(mockKafka.subscribe).toHaveBeenCalledTimes(1);
      expect(mockKafka.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          topicName: 'invoice-generate'
        })
      );
    });
  });

  describe('get', () => {
    it('should return list of invoices', async () => {
      const mockInvoices: DeepPartial<Invoice>[] = [
        {
          id: '1',
          title: 'Invoice #1',
          amount: 100,
          status: InvoiceStatus.PAID,
          orderId: 'order-1',
          userId: 'user-1'
        },
        {
          id: '2',
          title: 'Invoice #2',
          amount: 200,
          status: InvoiceStatus.PAID,
          orderId: 'order-2',
          userId: 'user-2'
        }
      ];

      mockInvoiceRepository.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockInvoices, mockInvoices.length])
      });

      mockInvoiceRepository.find.mockResolvedValue(mockInvoices as Invoice[]);

      const query: GetQueryResultsArgs = { page: 1, limit: 10, filters: {}, order: {} };
      const result = await invoiceService.get(query);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payloads).toHaveLength(2);
      expect(mockInvoiceRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return invoice with related order and user', async () => {
      const mockInvoiceDto: InvoiceDto = {
        id: '1',
        orderId: 'order-1',
        userId: 'user-1',
        title: 'Invoice #1',
        amount: 100,
        description: 'Test invoice 1',
        status: InvoiceStatus.PAID
      };

      const mockOrder = { id: 'order-1', totalAmount: 100, status: 'COMPLETED' };
      const mockUser = { id: 'user-1', firstName: 'John', lastName: 'Doe' };

      mockDataLoader.load.mockResolvedValue(mockInvoiceDto);
      mockKafka.requestResponse.mockResolvedValue([
        JSON.stringify(mockOrder),
        JSON.stringify(mockUser)
      ]);

      const result = await invoiceService.getById({ id: '1' });

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(result.payload).toHaveProperty('id', '1');
      expect(result.payload).toHaveProperty('order');
      expect(result.payload).toHaveProperty('user');
      expect(result.payload.order).toEqual(mockOrder);
      expect(result.payload.user).toEqual(mockUser);
      expect(mockDataLoader.load).toHaveBeenCalledWith('1');
      expect(mockKafka.requestResponse).toHaveBeenCalled();
    });
  });

  describe('generateInvoice', () => {
    it('should create an invoice when receiving a message', async () => {
      const invoiceArgs: GenerateInvoiceArgs = {
        orderId: 'order-1',
        userId: 'user-1',
        totalAmount: 100,
        newOrderStatus: OrderStatus.COMPLETED,
        newInvoiceStatus: InvoiceStatus.PAID
      };

      const message = JSON.stringify(invoiceArgs);
      
      const mockInvoice: DeepPartial<Invoice> = {
        id: '1',
        title: 'Invoice for Order #order-1',
        amount: 100,
        description: 'Invoice generated for completed order.',
        status: InvoiceStatus.PAID,
        orderId: 'order-1',
        userId: 'user-1',
        pdfUrl: 'some pdf file could be generated for that in the future...'
      };

      mockInvoiceRepository.create.mockReturnValue(mockInvoice as Invoice);
      mockInvoiceRepository.save.mockResolvedValue(mockInvoice as Invoice);

      const result = await invoiceService.generateInvoice(message);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(mockInvoiceRepository.create).toHaveBeenCalled();
      expect(mockInvoiceRepository.save).toHaveBeenCalledWith(mockInvoice);
    });

    it('should create a cancelled invoice when status is CANCELLED', async () => {
      const invoiceArgs: GenerateInvoiceArgs = {
        orderId: 'order-1',
        userId: 'user-1',
        totalAmount: 100,
        newOrderStatus: OrderStatus.CANCELLED,
        newInvoiceStatus: InvoiceStatus.CANCELLED
      };

      const message = JSON.stringify(invoiceArgs);
      
      const mockInvoice: DeepPartial<Invoice> = {
        id: '1',
        title: 'Invoice for Order #order-1',
        amount: 100,
        description: 'Invoice generated for canceled order.',
        status: InvoiceStatus.CANCELLED,
        orderId: 'order-1',
        userId: 'user-1',
        pdfUrl: 'some pdf file could be generated for that in the future...'
      };

      mockInvoiceRepository.create.mockReturnValue(mockInvoice as Invoice);
      mockInvoiceRepository.save.mockResolvedValue(mockInvoice as Invoice);

      const result = await invoiceService.generateInvoice(message);

      expect(result.result).toEqual(ResultMessage.SUCCESS);
      expect(mockInvoiceRepository.create).toHaveBeenCalled();
      expect(mockInvoiceRepository.save).toHaveBeenCalledWith(mockInvoice);
    });
  });
});
