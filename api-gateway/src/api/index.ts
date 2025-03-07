import { appConfig } from '@invoice-hub/common';

import { ApiGatewayController } from 'api/v1/api-gateway.controller';

export const controllers = [ApiGatewayController];
export const proxies = [
  { path: '/auth', target: appConfig.AUTH_ORIGIN_ROUTE },
  { path: '/invoices', target: appConfig.INVOICE_ORIGIN_ROUTE },
  { path: '/orders', target: appConfig.ORDER_ORIGIN_ROUTE }
] as { path: string; target: string }[];
