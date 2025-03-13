import 'reflect-metadata';
import { Container } from 'typedi';
import { config } from 'dotenv';
import http from 'http';
import { LoggerTracerInfrastructure, handleProcessSignals, appConfig, ClientIds, ExpressServerInfrastructure, getErrorMessage } from '@invoice-hub/common';

import { controllers } from 'api';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import {
  configureContainers, configureControllersAndServices, configureKafkaServices, configureMiddlewares, configureInfrastructures, configureLifecycleServices
} from 'application/ioc/bindings';

config();

const initializeDependencyInjections = async (): Promise<void> => {
  configureContainers();
  await configureInfrastructures();
  configureMiddlewares();
  configureLifecycleServices();
  configureControllersAndServices();
  await configureKafkaServices();
};

const initializeServer = async (): Promise<http.Server> => {
  const appServer = new ExpressServerInfrastructure();
  const app = await appServer.get({ clientId: ClientIds.INVOICE_SERVICE, controllers });
  const server = http.createServer(app);

  server.keepAliveTimeout = appConfig.KEEP_ALIVE_TIMEOUT;
  server.headersTimeout = appConfig.HEADERS_TIMEOUT;

  return server;
};

const startServer = (httpServer: http.Server, port: number): void => {
  httpServer.listen(port, () => LoggerTracerInfrastructure.log(`Invoice service running on port ${port}`, 'info'));
  httpServer.timeout = appConfig.SERVER_TIMEOUT;
};

const main = async (): Promise<void> => {
  try {
    await initializeDependencyInjections();

    const appServer = await initializeServer();
    const port = appConfig.PORT;

    const gracefulShutdownHelper = Container.get(GracefulShutdownHelper);

    handleProcessSignals({ shutdownCallback: gracefulShutdownHelper.shutDown.bind(gracefulShutdownHelper), callbackArgs: [appServer] });
    startServer(appServer, port);
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
