import { createExpressServer } from 'routing-controllers';
import { Express, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import session from 'express-session';
import passport from 'passport';

import { authorizationChecker, currentUserChecker } from '../application/helpers/authorization-checker.helper';
import { passportConfig} from '../core/configs/passport.config';
import { NotFoundError} from '../core/errors/not-found-error';
import { globalErrorHandler, GlobalErrorHandlerMiddleware } from '../core/middlewares/error-handler.middleware';
import { ExpressServerConfig } from '../domain/interfaces/express-service-config.interface';
import { ServicesName } from '../domain/enums/services-names.enum';
import { AuthStrategiesInfrastructure } from './auth-strategies.infrastructure';

export class ExpressServerInfrastructure {
  private static servers: Map<ServicesName, Express> = new Map();

  static async get (serviceName: ServicesName, config: ExpressServerConfig): Promise<Express> {
    if (!this.servers.has(serviceName)) {
      this.servers.set(serviceName, this.createServer(config));
    }

    return this.servers.get(serviceName)!;
  }

  private static createServer (config: ExpressServerConfig): Express {
    const { controllers, middlewares = [], proxies = [] } = config;

    const authStrategies = AuthStrategiesInfrastructure.buildStrategies();
    for (const strategy of authStrategies) {
      passport.use(strategy);
    }

    const app = createExpressServer({
      controllers,
      middlewares: [GlobalErrorHandlerMiddleware, ...middlewares],
      currentUserChecker,
      authorizationChecker,
      defaultErrorHandler: false
    });

    app.use(session({ secret: passportConfig.PASSPORT_JS_SESSION_SECRET_KEY, resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    for (const { path, target } of proxies) {
      app.use(path, createProxyMiddleware({ target, changeOrigin: true }));
    }

    app.all('*', (req: Request, _res: Response, next: NextFunction) => next(new NotFoundError(`Cannot find ${req.method} on ${req.url}`)));

    app.use(globalErrorHandler);

    return app;
  }
}
