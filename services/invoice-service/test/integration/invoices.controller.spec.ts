import { ContainerHelper, ContainerItems, GetQueryResultsArgs, InvoiceDto, InvoiceStatus, ResultMessage } from '@invoice-hub/common';

import { InvoicesController } from '../../src/api/v1/invoices.controller';
import { InvoiceService } from '../../src/application/services/invoice.service';

describe('InvoicesController Integration Tests', () => {
  let invoicesController: InvoicesController;
  let mockInvoiceService: jest.Mocked<Pick<InvoiceService, 'get' | 'getById'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvoiceService = {
      get: jest.fn(),
      getById: jest.fn()
    };

    jest.spyOn(ContainerHelper, 'get').mockImplementation((token) => {
      if (token === ContainerItems.IInvoiceService) {
        return mockInvoiceService;
      }

      return {};
    });

    invoicesController = new InvoicesController();
  });

  describe('get', () => {
    it('should return list of invoices', async () => {
      const mockInvoices: InvoiceDto[] = [
        {
          id: '1',
          title: 'Invoice #1',
          amount: 100,
          status: InvoiceStatus.PAID,
          orderId: 'order-1',
          userId: 'user-1',
          description: 'Test invoice 1'
        },
        {
          id: '1',
          title: 'Invoice #2',
          amount: 200,
          status: InvoiceStatus.PAID,
          orderId: 'order-2',
          userId: 'user-2',
          description: 'Test invoice 2'
        }
      ];

      const expectedResponse = {
        payloads: mockInvoices.map(invoice => ({
          id: invoice.id,
          title: invoice.title,
          amount: invoice.amount,
          status: invoice.status,
          orderId: invoice.orderId,
          userId: invoice.userId,
          description: invoice.description
        })) as InvoiceDto[],
        total: 2,
        result: ResultMessage.SUCCESS
      };

      mockInvoiceService.get.mockResolvedValue(expectedResponse);

      const query: GetQueryResultsArgs = { page: 1, limit: 10, filters: {}, order: {} };
      const result = await invoicesController.get(query);

      expect(result).toEqual(expectedResponse);
      expect(mockInvoiceService.get).toHaveBeenCalledWith(query);
    });
  });

  describe('getById', () => {
    it('should return an invoice by id', async () => {
      const mockInvoice: InvoiceDto = {
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

      const expectedResponse = {
        payload: {
          ...mockInvoice,
          order: mockOrder,
          user: mockUser
        },
        result: ResultMessage.SUCCESS
      };

      mockInvoiceService.getById.mockResolvedValue(expectedResponse);

      const result = await invoicesController.getById({ id: '1' });

      expect(result).toEqual(expectedResponse);
      expect(mockInvoiceService.getById).toHaveBeenCalledWith({ id: '1' });
    });
  });
}); 