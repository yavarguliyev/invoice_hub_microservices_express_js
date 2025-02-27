import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';

import { InvoicesController } from 'api/v1/invoices.controller';

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
    const controllers = [InvoicesController];

    const app = createExpressServer({
      controllers,
      middlewares: [],
      defaultErrorHandler: false
    });

    return app;
  }
}
