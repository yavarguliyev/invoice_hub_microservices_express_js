import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';
import { AuthStrategiesInfrastructure, globalErrorHandler, GlobalErrorHandlerMiddleware, NotFoundError } from '@invoice-hub/common';
import session from 'express-session';
import passport from 'passport';

import { AuthController } from 'api/v1/auth.controller';
import { RolesController } from 'api/v1/roles.controller';
import { UsersController } from 'api/v1/users.controller';
import { passportConfig } from 'core/configs/passport.config';

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

    const authStrategies = AuthStrategiesInfrastructure.buildStrategies();
    for (const strategy of authStrategies) {
      passport.use(strategy);
    }

    const app = createExpressServer({
      controllers,
      middlewares: [GlobalErrorHandlerMiddleware],
      defaultErrorHandler: false
    });

    app.use(session({ secret: passportConfig.PASSPORT_JS_SESSION_SECRET_KEY, resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.all('*', (req: Request) => {
      throw new NotFoundError(`Cannot find ${req.method} on ${req.url}`);
    });

    app.use(globalErrorHandler);

    return app;
  }
}
