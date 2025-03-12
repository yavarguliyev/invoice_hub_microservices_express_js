import { createExpressServer } from 'routing-controllers';
import { Express, Request, Response, NextFunction } from 'express';
import { Counter, Histogram, register } from 'prom-client';
import { createProxyMiddleware } from 'http-proxy-middleware';
import session from 'express-session';
import passport from 'passport';

import { AuthStrategiesInfrastructure } from '../auth/auth-strategies.infrastructure';
import { authorizationChecker, currentUserChecker } from '../../application/helpers/authorization-checker.helper';
import { passportConfig } from '../../core/configs/passport.config';
import { NotFoundError } from '../../core/errors/not-found-error';
import { globalErrorHandler, GlobalErrorHandlerMiddleware } from '../../core/middlewares/error-handler.middleware';
import { counter, histogram } from '../../core/configs/prometheus-grafana.config';
import { ExpressServerRequestOptions, ExpressServerBaseOptions } from '../../domain/interfaces/express-service-config.interface';
import { ClientIds } from '../../domain/enums/events.enum';

export class ExpressServerInfrastructure {
  private servers: Map<ClientIds, Express>;
  private requestCount: Counter;
  private responseDuration: Histogram;

  constructor() {
    this.servers = new Map();
    this.requestCount = new Counter(counter);
    this.responseDuration = new Histogram(histogram);
  }

  async get (args: ExpressServerRequestOptions & ExpressServerBaseOptions) {
    const { clientId } = args;

    if (!this.servers.has(clientId)) {
      const server = this.createServer(args);
      this.servers.set(clientId, server);
    }

    return this.servers.get(clientId)!;
  }

  private createServer (config: ExpressServerRequestOptions) {
    const { controllers, middlewares = [], proxies = [] } = config;

    const authStrategies = AuthStrategiesInfrastructure.buildStrategies();
    authStrategies.forEach(strategy => passport.use(strategy));

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

    proxies.forEach(({ path, target }) => {
      app.use(path, createProxyMiddleware({ target, changeOrigin: true }));
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      const end = this.responseDuration.startTimer();
      const route = req.route ? req.route.path : req.url;

      res.on('finish', () => {
        this.requestCount.labels(req.method, route, res.statusCode.toString()).inc();
        end();
      });

      next();
    });

    app.get('/metrics', async (_req: Request, res: Response) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });

    app.all('*', (req: Request, _res: Response, next: NextFunction) =>
      next(new NotFoundError(`Cannot find ${req.method} on ${req.url}`))
    );

    app.use(globalErrorHandler);

    return app;
  }
}
