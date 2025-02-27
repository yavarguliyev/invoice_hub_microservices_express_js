import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';

import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';

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
    const controllers = [AuthController, RolesController, UsersController];

    const app = createExpressServer({
      controllers,
      middlewares: [],
      defaultErrorHandler: false
    });

    return app;
  }
}
