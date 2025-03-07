import 'reflect-metadata';
import { config } from 'dotenv';
import http from 'http';
import {
  KafkaInfrastructure, LoggerTracerInfrastructure, handleProcessSignals, appConfig, ClientIds, ServicesName, ExpressServerInfrastructure, RedisInfrastructure
} from '@invoice-hub/common';

import { controllers } from 'api';
import { GracefulShutdownHelper } from 'application/helpers/graceful-shutdown.helper';
import { configureContainers, configureControllersAndServices, configureKafkaServices, configureMiddlewares, configureRepositories } from 'application/ioc/bindings';

config();

const initializeDependencyInjections = async (): Promise<void> => {
  configureContainers();
  await configureRepositories();
  configureMiddlewares();
  configureControllersAndServices();
};

const initializeInfrastructureServices = async (): Promise<void> => {
  await RedisInfrastructure.initialize({ serviceName: ServicesName.INVOICE_SERVICE });
  await KafkaInfrastructure.initialize({ clientId: ClientIds.INVOICE_SERVICE });
  await configureKafkaServices();
};

const initializeServer = async (): Promise<http.Server> => {
  const app = await ExpressServerInfrastructure.get(ServicesName.INVOICE_SERVICE, { controllers });
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
