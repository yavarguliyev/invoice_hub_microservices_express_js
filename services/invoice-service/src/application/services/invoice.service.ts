import { Container } from 'typedi';
import DataLoader from 'dataloader';
import {
  ContainerKeys,
  DataLoaderInfrastructure,
  GetInvoiceArgs,
  GetQueryResultsArgs,
  InvoiceDto,
  RedisDecorator,
  ResponseResults,
  ResultMessage,
  redisCacheConfig,
  queryResults,
  ContainerHelper,
  ContainerItems,
  KafkaInfrastructure,
  UserDto,
  OrderDto
} from '@invoice-hub/common';

import { IInvoiceTransactionManager } from 'application/transactions/invoice-transaction.manager';
import { IInvoiceKafkaSubscriber } from 'application/kafka/invoice-kafka.subscriber';
import { buildKafkaRequestOptionsHelper } from 'application/helpers/kafka-request.helper';
import { InvoiceRepository } from 'domain/repositories/invoice.repository';
import { Invoice } from 'domain/entities/invoice.entity';

export interface IInvoiceService {
  initialize(): Promise<void>;
  get(query: GetQueryResultsArgs): Promise<ResponseResults<InvoiceDto>>;
  getById(args: GetInvoiceArgs): Promise<ResponseResults<InvoiceDto & { user: UserDto, order: OrderDto }>>;
}

export class InvoiceService implements IInvoiceService {
  // #region DI
  private _invoiceRepository?: InvoiceRepository;
  private _invoiceDtoLoaderById?: DataLoader<string, InvoiceDto>;
  private _transactionManager?: IInvoiceTransactionManager;
  private _kafkaSubscriber?: IInvoiceKafkaSubscriber;
  private _kafka?: KafkaInfrastructure;

  private get invoiceRepository () {
    if (!this._invoiceRepository) {
      this._invoiceRepository = Container.get(InvoiceRepository);
    }

    return this._invoiceRepository;
  }

  private get invoiceDtoLoaderById () {
    if (!this._invoiceDtoLoaderById) {
      this._invoiceDtoLoaderById = Container.get<DataLoaderInfrastructure<Invoice>>(ContainerKeys.INVOICE_DATA_LOADER)
        .getDataLoader({ entity: Invoice, Dto: InvoiceDto, fetchField: 'id' });
    }

    return this._invoiceDtoLoaderById;
  }

  private get transactionManager () {
    if (!this._transactionManager) {
      this._transactionManager = ContainerHelper.get<IInvoiceTransactionManager>(ContainerItems.IInvoiceTransactionManager);
    }

    return this._transactionManager;
  }

  private get kafkaSubscriber () {
    if (!this._kafkaSubscriber) {
      this._kafkaSubscriber = ContainerHelper.get<IInvoiceKafkaSubscriber>(ContainerItems.IInvoiceKafkaSubscriber);
    }

    return this._kafkaSubscriber;
  }

  private get kafka () {
    if (!this._kafka) {
      this._kafka = Container.get(KafkaInfrastructure);
    }

    return this._kafka;
  }
  // #endregion

  async initialize () {
    await this.kafkaSubscriber.initialize();
    await this.transactionManager.initialize();
  }

  @RedisDecorator(redisCacheConfig.INVOICE_LIST)
  async get (query: GetQueryResultsArgs) {
    const { payloads, total } = await queryResults({ repository: this.invoiceRepository, query, dtoClass: InvoiceDto });
    return { payloads, total, result: ResultMessage.SUCCESS };
  }

  async getById (args: GetInvoiceArgs): Promise<ResponseResults<InvoiceDto & { user: UserDto, order: OrderDto }>> {
    const invoiceDto = await this.invoiceDtoLoaderById.load(args.id);

    if (!invoiceDto.userId || !invoiceDto.orderId) {
      this.invoiceDtoLoaderById.clear(args.id);
      return await this.getById(args);
    }

    const options = buildKafkaRequestOptionsHelper(invoiceDto);

    const [orderResponse, userResponse] = await this.kafka.requestResponse(options);

    const order = JSON.parse(orderResponse);
    const user = JSON.parse(userResponse);

    delete invoiceDto.orderId;
    delete invoiceDto.userId;

    return { payload: { ...invoiceDto, order, user }, result: ResultMessage.SUCCESS };
  }
}
