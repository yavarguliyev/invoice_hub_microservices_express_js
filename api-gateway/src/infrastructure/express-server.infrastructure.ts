import { createExpressServer } from 'routing-controllers';
import { Express, Request } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { globalErrorHandler, GlobalErrorHandlerMiddleware, NotFoundError } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';
import { appConfig } from 'core/configs/app.config';

export interface IExpressServerInfrastructure {
  get(): Promise<Express>;
}

export class ExpressServerInfrastructure implements IExpressServerInfrastructure {
  private server?: Express;

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
      middlewares: [GlobalErrorHandlerMiddleware],
      defaultErrorHandler: false
    });

    app.use('/auth', createProxyMiddleware({ target: appConfig.AUTH_ORIGIN_ROUTE, changeOrigin: true }));
    app.use('/invoices', createProxyMiddleware({ target: appConfig.INVOICE_ORIGIN_ROUTE, changeOrigin: true }));
    app.use('/orders', createProxyMiddleware({ target: appConfig.ORDER_ORIGIN_ROUTE, changeOrigin: true }));

    app.all('*', (req: Request) => {
      throw new NotFoundError(`Cannot find ${req.method} on ${req.url}`);
    });

    app.use(globalErrorHandler);

    return app;
  }
}
