import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';
import { globalErrorHandler, GlobalErrorHandlerMiddleware, NotFoundError } from '@invoice-hub/common';

import { InvoicesController } from 'api/v1/invoices.controller';

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
    const controllers = [InvoicesController];

    const app = createExpressServer({
      controllers,
      middlewares: [GlobalErrorHandlerMiddleware],
      defaultErrorHandler: false
    });

    app.all('*', (req: Request) => {
      throw new NotFoundError(`Cannot find ${req.method} on ${req.url}`);
    });

    app.use(globalErrorHandler);

    return app;
  }
}
