import 'reflect-metadata';
import { config } from 'dotenv';
import http from 'http';
import { KafkaInfrastructure, LoggerTracerInfrastructure, handleProcessSignals } from '@invoice-hub/common';

import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import {
  configureContainers, configureControllersAndServices, configureInfrastructures, configureKafkaServices, configureMiddlewares, configureRepositories
} from 'application/ioc/bindings';
import { appConfig } from 'core/configs/app.config';
import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';

config();

const initializeDependencyInjections = async (): Promise<void> => {
  configureContainers();
  configureInfrastructures();
  await configureRepositories();
  configureMiddlewares();
  configureControllersAndServices();
};

const initializeInfrastructureServices = async (): Promise<void> => {
  await KafkaInfrastructure.initialize();
  await configureKafkaServices();
};

const initializeServer = async (): Promise<http.Server> => {
  const expressServer = new ExpressServerInfrastructure();
  const app = await expressServer.get();
  const server = http.createServer(app);

  server.keepAliveTimeout = appConfig.KEEP_ALIVE_TIMEOUT;
  server.headersTimeout = appConfig.HEADERS_TIMEOUT;

  return server;
};

const startServer = (httpServer: http.Server, port: number): void => {
  httpServer.listen(port, () => LoggerTracerInfrastructure.log(`Order service running on port ${port}`, 'info'));
  httpServer.timeout = appConfig.SERVER_TIMEOUT;
};

const main = async (): Promise<void> => {
  try {
    await initializeDependencyInjections();
    await initializeInfrastructureServices();

    const appServer = await initializeServer();
    const port = appConfig.PORT;

    startServer(appServer, port);

    handleProcessSignals({ shutdownCallback: GracefulShutdownHelper.shutDown.bind(GracefulShutdownHelper), callbackArgs: [appServer] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    LoggerTracerInfrastructure.log(`Error during initialization: ${errorMessage}`, 'error');
    process.exit(1);
  }
};

process.on('uncaughtException', () => {
  LoggerTracerInfrastructure.log('Uncaught exception, exiting process', 'error');
  process.exit(1);
});

process.on('unhandledRejection', () => {
  LoggerTracerInfrastructure.log('Unhandled rejection, exiting process', 'error');
  process.exit(1);
});

main();
