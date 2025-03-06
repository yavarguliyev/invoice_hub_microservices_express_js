import { createExpressServer } from 'routing-controllers';
import { Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import {
  authorizationChecker, AuthStrategiesInfrastructure, currentUserChecker, globalErrorHandler, GlobalErrorHandlerMiddleware, NotFoundError, passportConfig
} from '@invoice-hub/common';

import { OrdersController } from 'api/v1/orders.controller';

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
    const controllers = [OrdersController];

    const authStrategies = AuthStrategiesInfrastructure.buildStrategies();
    for (const strategy of authStrategies) {
      passport.use(strategy);
    }

    const app = createExpressServer({
      controllers,
      middlewares: [GlobalErrorHandlerMiddleware],
      currentUserChecker,
      authorizationChecker,
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
