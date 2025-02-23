import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';

import { UsersController } from 'api/v1/users.controller';

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
    const controllers = [UsersController];

    const app = createExpressServer({
      controllers,
      middlewares: [],
      defaultErrorHandler: false
    });

    return app;
  }
}
