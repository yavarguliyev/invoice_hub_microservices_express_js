export enum Subjects {
  FETCH_USER_REQUEST = 'fetch-user-request',
  FETCH_USER_RESPONSE = 'fetch-user-response',
  ORDER_CREATED = 'order-created',
  ORDER_CANCELED = 'order-canceled',
  FETCH_ORDER_REQUEST = 'fetch-order-request',
  FETCH_ORDER_RESPONSE = 'fetch-order-response',
  INVOICE_GENERATE = 'invoice-generate'
}

export enum GroupIds {
  BASE_GROUP = 'invoice_hub_group',
  AUTH_SERVICE_GROUP = 'auth-service-group',
  INVOICE_SERVICE_GROUP = 'invoice-service-group',
  INVOICE_ORDER_FETCH_GROUP = 'invoice-order-fetch-group',
  INVOICE_USER_FETCH_GROUP = 'invoice-user-fetch-group',
  ORDER_SERVICE_GROUP = 'order-service-group',
  ORDER_USER_FETCH_GROUP = 'order-user-fetch-group'
}

export enum ClientIds {
  API_GATEWAY = 'api-gateway',
  AUTH_SERVICE = 'auth-service',
  INVOICE_SERVICE = 'invoice-service',
  ORDER_SERVICE = 'order-service'
}
