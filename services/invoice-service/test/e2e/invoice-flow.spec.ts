import { Container } from 'typedi';
import { DeepPartial, DataSource } from 'typeorm';
import { ContainerHelper, ContainerItems, GenerateInvoiceArgs, InvoiceStatus, OrderStatus, DbConnectionInfrastructure, RedisInfrastructure } from '@invoice-hub/common';

import { InvoiceService } from '../../src/application/services/invoice.service';
import { InvoiceRepository } from '../../src/domain/repositories/invoice.repository';
import { Invoice } from '../../src/domain/entities/invoice.entity';

jest.mock('../helpers/database', () => ({
  setupTestDatabase: jest.fn().mockResolvedValue(undefined),
  clearTestData: jest.fn().mockResolvedValue(undefined),
  closeTestDatabase: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../helpers/server', () => ({
  startTestServer: jest.fn().mockResolvedValue('http://localhost:4002'),
  stopTestServer: jest.fn().mockResolvedValue(undefined)
}));

describe('Invoice Flow (E2E)', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<Pick<InvoiceRepository, 'find' | 'findOne' | 'create' | 'save'>>;
  let serverUrl: string;

  beforeAll(async () => {
    const mockDataSource = {
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      isInitialized: true,
      manager: {},
      createQueryRunner: jest.fn()
    } as unknown as DataSource;
    
    const mockDbConnection = new DbConnectionInfrastructure();
    mockDbConnection.create = jest.fn().mockReturnValue(mockDataSource);
    mockDbConnection.getDataSource = jest.fn().mockReturnValue(mockDataSource);
    
    Container.set(DbConnectionInfrastructure, mockDbConnection);
    serverUrl = 'http://localhost:4002';
  });

  afterAll(async () => {});

  beforeEach(async () => {
    jest.clearAllMocks();

    mockInvoiceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    jest.restoreAllMocks();

    const redisMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      getHashKeys: jest.fn().mockResolvedValue([]),
      deleteKeys: jest.fn().mockResolvedValue(true),
      setHashKeys: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(Container, 'get').mockImplementation((token) => {
      if (token === InvoiceRepository) {
        return mockInvoiceRepository;
      }
      if (token === RedisInfrastructure) {
        return redisMock;
      }
      return {};
    });

    invoiceService = new InvoiceService();

    jest.spyOn(ContainerHelper, 'get').mockImplementation((token) => {
      if (token === ContainerItems.IInvoiceService) {
        return invoiceService;
      }
      return {};
    });
  });

  it('should handle full invoice generation and retrieval flow', async () => {
    const invoiceArgs: GenerateInvoiceArgs = {
      orderId: 'order-1',
      userId: 'user-1',
      totalAmount: 150,
      newOrderStatus: OrderStatus.COMPLETED,
      newInvoiceStatus: InvoiceStatus.PAID
    };

    const mockInvoice: DeepPartial<Invoice> = {
      id: '1',
      title: `Invoice for Order #${invoiceArgs.orderId}`,
      amount: invoiceArgs.totalAmount,
      description: 'Invoice generated for completed order.',
      status: InvoiceStatus.PAID,
      orderId: invoiceArgs.orderId,
      userId: invoiceArgs.userId,
      pdfUrl: 'some pdf file could be generated for that in the future...'
    };

    mockInvoiceRepository.create.mockReturnValue(mockInvoice as Invoice);
    mockInvoiceRepository.save.mockResolvedValue(mockInvoice as Invoice);
    mockInvoiceRepository.find.mockResolvedValue([mockInvoice as Invoice]);
    mockInvoiceRepository.findOne.mockResolvedValue(mockInvoice as Invoice);

    const message = JSON.stringify(invoiceArgs);
    await invoiceService.generateInvoice(message);

    expect(mockInvoiceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      title: `Invoice for Order #${invoiceArgs.orderId}`,
      amount: invoiceArgs.totalAmount,
      status: InvoiceStatus.PAID
    }));
    expect(mockInvoiceRepository.save).toHaveBeenCalledWith(mockInvoice);
  });
});
