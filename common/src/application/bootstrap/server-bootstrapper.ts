import { Container } from 'typedi';
import { useContainer as typeormUseContainer, EntitySchema, EntityTarget, ObjectLiteral } from 'typeorm';
import { useContainer as routingControllersUseContainer } from 'routing-controllers';
import http from 'http';

import { ContainerHelper } from '../ioc/helpers/container.helper';
import { GracefulShutdownHelper } from '../../application/helpers/graceful-shutdown.helper';
import { getErrorMessage, handleProcessSignals, registerService } from '../../application/helpers/utility-functions.helper';
import { getDataSourceConfig } from '../../core/configs/datasource.config';
import { GlobalErrorHandlerMiddleware } from '../../core/middlewares/error-handler.middleware';
import { IEntityWithId } from '../../core/types/db-results.type';
import { appConfig } from '../../core/configs/app.config';
import { ClientIds, GroupIds } from '../../domain/enums/events.enum';
import { DependencyConfig, ServerConfig, StartServerConfig, GracefulShutDownServiceConfig, AppConfig } from '../../domain/interfaces/dependency-config.interface';
import { DbConnectionInfrastructure } from '../../infrastructure/database/db-connection.infrastructure';
import { DataLoaderInfrastructure } from '../../infrastructure/database/data-loader.infrastructure';
import { KafkaInfrastructure } from '../../infrastructure/kafka/kafka.infrastructure';
import { RedisInfrastructure } from '../../infrastructure/redis/redis.infrastructure';
import { ExpressServerInfrastructure } from '../../infrastructure/server/express-server.infrastructure';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';
import { TransactionCoordinatorInfrastructure } from '../../infrastructure/transaction/transaction-coordinator.infrastructure';

export class ServerBootstrapper {
  private static configureContainers (useTypeOrm: boolean) {
    if (useTypeOrm) {
      typeormUseContainer(Container);
    }

    routingControllersUseContainer(Container);
  }

  private static async configureInfrastructure (
    clientId: ClientIds,
    groupId: GroupIds,
    entities: (string | Function | EntitySchema)[],
    dataLoaders: { containerKey: string; entity: EntityTarget<IEntityWithId> }[]
  ): Promise<void> {
    const kafka = new KafkaInfrastructure({ clientId, groupId });
    await kafka.initialize();

    const redis = new RedisInfrastructure();
    await redis.initialize({ clientId });

    const dbConnection = new DbConnectionInfrastructure();
    const dataSource = await dbConnection.create({ clientId, dataSourceOptions: getDataSourceConfig(false, entities) });
    await dataSource.initialize();

    Container.set(KafkaInfrastructure, kafka);
    Container.set(RedisInfrastructure, redis);
    Container.set(DbConnectionInfrastructure, dbConnection);

    dataLoaders.forEach(({ containerKey, entity }) => {
      Container.set(containerKey, new DataLoaderInfrastructure(dataSource.getRepository(entity)));
    });

    Container.set(TransactionCoordinatorInfrastructure, new TransactionCoordinatorInfrastructure({ clientId }));
  }

  private static configureLifecycleServices (config: GracefulShutDownServiceConfig[]) {
    Container.set(GlobalErrorHandlerMiddleware, new GlobalErrorHandlerMiddleware());
    Container.set(ExpressServerInfrastructure, new ExpressServerInfrastructure());
    Container.set(GracefulShutdownHelper, new GracefulShutdownHelper(config));
  }

  private static configureControllersAndServices<T, U, Z extends ObjectLiteral> ({
    services, clientId, repositories, controllers, useTypeOrm
  }: Omit<DependencyConfig<T, U, Z>, 'entities' | 'dataLoaders' | 'serviceKeys' | 'groupId'>) {
    services.forEach(({ id, service }) => registerService({ id, service }));

    if (useTypeOrm) {
      const dbConnection = Container.get(DbConnectionInfrastructure);
      const dataSource = dbConnection.getDataSource({ clientId });

      if (!dataSource) {
        throw new Error('Database connection is not initialized.');
      }

      repositories.forEach(({ repository, entity }) => Container.set(repository, dataSource.getRepository(entity)));
    }

    controllers.forEach((controller) => ContainerHelper.registerController(controller));
  }

  private static async configureKafkaServices (serviceKeys: string[]) {
    for (const key of serviceKeys) {
      const service = ContainerHelper.get<{ initialize?: () => Promise<void> }>(key);

      if (service?.initialize) {
        await service.initialize();
      }
    }
  }

  static async initializeDependencies<T, U, Z extends ObjectLiteral> (config: DependencyConfig<T, U, Z> & { gracefulShutdownServices: GracefulShutDownServiceConfig[] } ) {
    const { useTypeOrm, clientId, groupId, entities, dataLoaders, services, repositories, controllers, serviceKeys, gracefulShutdownServices } = config;

    this.configureContainers(useTypeOrm);

    if (useTypeOrm) {
      await this.configureInfrastructure(clientId, groupId, entities, dataLoaders);
    }

    this.configureLifecycleServices(gracefulShutdownServices);
    this.configureControllersAndServices({ services, clientId, repositories, controllers, useTypeOrm });

    if (useTypeOrm) {
      await this.configureKafkaServices(serviceKeys);
    }
  }

  private static async initializeServer<T> ({ clientId, controllers, proxies }: ServerConfig<T>) {
    const appServer = Container.get(ExpressServerInfrastructure);

    const app = await appServer.get({ clientId, controllers, proxies });
    const server = http.createServer(app);

    server.keepAliveTimeout = appConfig.KEEP_ALIVE_TIMEOUT;
    server.headersTimeout = appConfig.HEADERS_TIMEOUT;

    return server;
  }

  private static startServer ({ httpServer, port, appName }: StartServerConfig) {
    httpServer.listen(port, () => LoggerTracerInfrastructure.log(`${appName} running on port ${port}`, 'info'));
    httpServer.timeout = appConfig.SERVER_TIMEOUT;
  }

  static async start<T, U, Z extends ObjectLiteral> ({ dependencyInjectionsConfig, serverConfig, appName, gracefulShutDownService }: AppConfig<T, U, Z>) {
    try {
      await this.initializeDependencies({ ...dependencyInjectionsConfig, gracefulShutdownServices: gracefulShutDownService });
      const appServer = await this.initializeServer(serverConfig);
      const gracefulShutdownHelper = Container.get(GracefulShutdownHelper);

      handleProcessSignals({ shutdownCallback: gracefulShutdownHelper.shutDown.bind(gracefulShutdownHelper), callbackArgs: [appServer] });
      this.startServer({ port: appConfig.PORT, httpServer: appServer, appName });
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error during initialization: ${getErrorMessage(error)}`, 'error');
      process.exit(1);
    }
  }
}