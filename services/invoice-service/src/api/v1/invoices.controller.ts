import { JsonController, Get, Post, Body, Param, QueryParams } from 'routing-controllers';
import { createVersionedRoute, KafkaInfrastructure } from '@invoice-hub/common-packages';

@JsonController(createVersionedRoute({ controllerPath: '/invoices', version: 'v1' }))
export class InvoicessController {
  constructor () {}

  @Get('/')
  async get () {
    // KafkaInfrastructure.subscribe('invoice-topic');

    return { message: 'Invoice service' };
  }

  @Get('/:id/id/:ref/ref')
  async getByQuery (@Param('id') id: number, @Param('idref') ref: string, @QueryParams() query: any) {
    const { status = 'status', amount = 10 } = query;

    return { message: `Invoice with this id: ${id} has updated this ref number: ${ref}. And status is ${status}, amount is ${amount}` };
  }

  @Get('/:id')
  async getById (@Param('id') id: number) {
    return { message: `Invoice with this id: ${id}...` };
  }

  @Post('/')
  async create (@Body() args: any) {
    const { invoiceData } = args;
    await KafkaInfrastructure.publish('invoices-topic', JSON.stringify(invoiceData));

    return { message: 'Invoice created and event sent', payload: { invoiceData } };
  }
}
