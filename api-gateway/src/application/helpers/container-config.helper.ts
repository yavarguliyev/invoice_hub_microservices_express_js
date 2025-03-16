import { Constructable } from 'typedi';
import { appConfig as config, ClientIds, ContainerItems, GracefulShutDownServiceConfig, GroupIds, RegisterServiceOptions } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';
import { ApiService, IApiService } from 'application/services/api.service';

export const services = [
  { id: ContainerItems.IApiService, service: ApiService } as RegisterServiceOptions<IApiService>
];

export const controllers: Constructable<ApiGatewayController>[] = [
  ApiGatewayController as Constructable<ApiGatewayController>
];

export const proxies = [
  { path: config.AUTH_PATH, target: config.AUTH_ORIGIN_ROUTE },
  { path: config.INVOICE_PATH, target: config.INVOICE_ORIGIN_ROUTE },
  { path: config.ORDER_PATH, target: config.ORDER_ORIGIN_ROUTE }
] as { path: string; target: string }[];

export const dependencyInjectionsConfig = {
  useTypeOrm: false,
  clientId: ClientIds.API_GATEWAY,
  groupId: GroupIds.BASE_GROUP,
  entities: [],
  controllers,
  dataLoaders: [],
  repositories: [],
  services,
  serviceKeys: []
};

export const serverConfig = { clientId: ClientIds.API_GATEWAY, controllers, proxies };

export const gracefulShutDownService: GracefulShutDownServiceConfig[] = [
  { name: ClientIds.API_GATEWAY, disconnect: () => Promise.resolve() }
];

export const appConfig = { dependencyInjectionsConfig, serverConfig, gracefulShutDownService, appName: ClientIds.API_GATEWAY };
