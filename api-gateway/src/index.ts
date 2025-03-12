import 'reflect-metadata';
import { config } from 'dotenv';
import http from 'http';
import { LoggerTracerInfrastructure, handleProcessSignals, appConfig, ClientIds, ExpressServerInfrastructure, getErrorMessage } from '@invoice-hub/common';

import { controllers, proxies } from 'api';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import { configureContainers, configureControllersAndServices, configureMiddlewares } from 'application/ioc/bindings';

config();

const initializeDependencyInjections = async (): Promise<void> => {
  configureContainers();
  configureMiddlewares();
  configureControllersAndServices();
};

const initializeServer = async (): Promise<http.Server> => {
  const appServer = new ExpressServerInfrastructure();
  const app = await appServer.get({ clientId: ClientIds.API_GATEWAY, controllers, proxies });
  const server = http.createServer(app);

  server.keepAliveTimeout = appConfig.KEEP_ALIVE_TIMEOUT;
  server.headersTimeout = appConfig.HEADERS_TIMEOUT;

  return server;
};

const startServer = (httpServer: http.Server, port: number): void => {
  httpServer.listen(port, () => LoggerTracerInfrastructure.log(`Api gateway running on port ${port}`, 'info'));
  httpServer.timeout = appConfig.SERVER_TIMEOUT;
};

const main = async (): Promise<void> => {
  try {
    await initializeDependencyInjections();

    const appServer = await initializeServer();
    const port = appConfig.PORT;

    startServer(appServer, port);
    handleProcessSignals({ shutdownCallback: GracefulShutdownHelper.shutDown.bind(GracefulShutdownHelper), callbackArgs: [appServer] });
  } catch (error) {
    LoggerTracerInfrastructure.log(`Error during initialization: ${getErrorMessage(error)}`, 'error');

    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  LoggerTracerInfrastructure.log(`Uncaught exception: ${getErrorMessage(error)}`, 'error');

  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  LoggerTracerInfrastructure.log(`Unhandled rejection: ${getErrorMessage(reason)}`, 'error');

  process.exit(1);
});

main();
