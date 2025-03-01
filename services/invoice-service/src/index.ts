import 'reflect-metadata';
import { config } from 'dotenv';
import http from 'http';
import {
  KafkaInfrastructure,
  GracefulShutdownHelper,
  LoggerTracerInfrastructure,
  handleProcessSignals
} from '@invoice-hub/common-packages';

import { ExpressServerInfrastructure } from 'infrastructure/express-server.infrastructure';
import { configureContainers, configureControllersAndServices, configureInfrastructures, configureKafkaServices, configureMiddlewares } from 'application/ioc/bindings';

config();

const initializeDependencyInjections = async (): Promise<void> => {
  configureContainers();
  configureInfrastructures();
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

  server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT);
  server.headersTimeout = Number(process.env.HEADERS_TIMEOUT);

  return server;
};

const startServer = (httpServer: http.Server, port: number): void => {
  httpServer.listen(port, () => LoggerTracerInfrastructure.log(`Invoice service running on port ${port}`, 'info'));
  httpServer.timeout = parseInt(process.env.SERVER_TIMEOUT!);
};

const main = async (): Promise<void> => {
  try {
    await initializeDependencyInjections();
    await initializeInfrastructureServices();

    const appServer = await initializeServer();
    const port = Number(process.env.PORT);

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
