export enum Subjects {
  ORDER_CREATED = 'order-created',
  ORDER_CANCELED = 'order-canceled',
  INVOICE_GENERATE = 'invoice-generate'
}

export enum GroupIds {
  BASE_GROUP = 'invoice_hub_group',
  AUTH_SERVICE_GROUP = 'auth-service-group',
  INVOICE_SERVICE_GROUP = 'invoice-service-group',
  ORDER_SERVICE_GROUP = 'order-service-group'
}

export enum ClientIds {
  AUTH_SERVICE = 'auth-service',
  INVOICE_SERVICE = 'invoice-service',
  ORDER_SERVICE = 'order-service'
}
