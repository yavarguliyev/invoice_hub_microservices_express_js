import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ErrorHandlerMiddleware } from '@invoice-hub/common-packages';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';

export interface IExpressServerInfrastructure {
  get(): Promise<Express>;
}

export class ExpressServerInfrastructure implements IExpressServerInfrastructure {
  private server?: Express;

  public constructor () {}

  public async get (): Promise<Express> {
    if (!this.server) {
      this.server = this.createServer();
    }

    return this.server;
  }

  private createServer (): Express {
    const controllers = [ApiGatewayController];

    const app = createExpressServer({
      controllers,
      middlewares: [ErrorHandlerMiddleware],
      defaultErrorHandler: false
    });

    app.use('/auth', createProxyMiddleware({ target: process.env.AUTH_ORIGIN_ROUTE, changeOrigin: true }));
    app.use('/invoices', createProxyMiddleware({ target: process.env.INVOICE_ORIGIN_ROUTE, changeOrigin: true }));
    app.use('/orders', createProxyMiddleware({ target: process.env.ORDER_ORIGIN_ROUTE, changeOrigin: true }));

    return app;
  }
}
