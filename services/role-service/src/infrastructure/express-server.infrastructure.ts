import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';

import { RolesController } from 'api/v1/roles.controller';

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
    const controllers = [RolesController];

    const app = createExpressServer({
      controllers,
      middlewares: [],
      defaultErrorHandler: false
    });

    return app;
  }
}
