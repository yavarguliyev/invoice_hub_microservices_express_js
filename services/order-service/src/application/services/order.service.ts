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
    await KafkaInfrastructure.publish('invoice-generate', JSON.stringify({ orderId, order }));

    LoggerTracerInfrastructure.log(`Order Id: ${orderId} generated for generating invoice for the order: ${JSON.stringify({ order })}...`);
  }

  async get () {
    return { result: 'SUCCEED' };
  }
}
