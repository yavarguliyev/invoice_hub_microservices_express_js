import { KafkaInfrastructure, LoggerTracerInfrastructure } from '@invoice-hub/common-packages';

export interface IOrderService {
  initialize (): Promise<void>;
  handleOrderCreated (message: string): Promise<any>;
  get (): Promise<any>;
}

export class OrderService implements IOrderService {
  constructor () {}

  async initialize () {
    await KafkaInfrastructure.subscribe('order-created', this.handleOrderCreated.bind(this), { groupId: 'order-service-group' });
  }

  async handleOrderCreated (message: string) {
    const { orderId, order } = JSON.parse(message);

    LoggerTracerInfrastructure.log(`Order by id: ${orderId} created, generating invoice...`);
    await KafkaInfrastructure.publish('invoice-generate', JSON.stringify({ orderId, order }));
  }

  async get () {
    return { result: 'SUCCEED' };
  }
}
