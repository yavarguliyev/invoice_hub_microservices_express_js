import { Constructable } from 'typedi';
import { appConfig as config, ClientIds, ContainerItems, GracefulShutDownServiceConfig, GroupIds, RegisterServiceOptions } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';
import { ApiService, IApiService } from 'application/services/api.service';

class ApiGatewayAppConfig {
  private static services: RegisterServiceOptions<IApiService>[] = [
    { id: ContainerItems.IApiService, service: ApiService } as RegisterServiceOptions<IApiService>
  ];

  private static controllers: Constructable<ApiGatewayController>[] = [
    ApiGatewayController as Constructable<ApiGatewayController>
  ];

  private static proxies = [
    { path: config.AUTH_PATH, target: config.AUTH_ORIGIN_ROUTE },
    { path: config.INVOICE_PATH, target: config.INVOICE_ORIGIN_ROUTE },
    { path: config.ORDER_PATH, target: config.ORDER_ORIGIN_ROUTE }
  ] as { path: string; target: string }[];

  private static dependencyInjectionsConfig = {
    useTypeOrm: false,
    clientId: ClientIds.API_GATEWAY,
    groupId: GroupIds.BASE_GROUP,
    entities: [],
    controllers: ApiGatewayAppConfig.controllers,
    dataLoaders: [],
    repositories: [],
    services: ApiGatewayAppConfig.services,
    serviceKeys: []
  };

  private static serverConfig = {
    clientId: ClientIds.API_GATEWAY,
    controllers: ApiGatewayAppConfig.controllers,
    proxies: ApiGatewayAppConfig.proxies
  };

  private static gracefulShutDownService: GracefulShutDownServiceConfig[] = [
    { name: ClientIds.API_GATEWAY, disconnect: () => Promise.resolve() }
  ];

  static get config () {
    return {
      dependencyInjectionsConfig: ApiGatewayAppConfig.dependencyInjectionsConfig,
      serverConfig: ApiGatewayAppConfig.serverConfig,
      gracefulShutDownService: ApiGatewayAppConfig.gracefulShutDownService,
      appName: ClientIds.API_GATEWAY
    };
  }
}

const appConfig = ApiGatewayAppConfig.config;

export { appConfig };
