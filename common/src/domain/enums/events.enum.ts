export enum Subjects {
  FETCH_USER_REQUEST = 'fetch-user-request',
  FETCH_USER_RESPONSE = 'fetch-user-response',

  FETCH_ORDER_REQUEST = 'fetch-order-request',
  FETCH_ORDER_RESPONSE = 'fetch-order-response',
  
  FETCH_INVOICE_REQUEST = 'fetch-invoice-request',
  FETCH_INVOICE_RESPONSE = 'fetch-invoice-response',

  UPDATE_ORDER_STATUS = 'update_order_status',
  INVOICE_GENERATE = 'invoice-generate',
  
  TRANSACTION_STEP_COMPLETED = 'transaction_step_completed',
  TRANSACTION_STEP_FAILED = 'transaction_step_failed',
  TRANSACTION_COMPENSATION_START = 'transaction_compensation_start',
  TRANSACTION_COMPENSATION_COMPLETED = 'transaction_compensation_completed',
  TRANSACTION_COMPLETED = 'transaction_completed',
  TRANSACTION_TIMEOUT = 'transaction_timeout',
  TRANSACTION_USER_NOTIFICATION = 'transaction_user_notification',

  ORDER_APPROVAL_STEP_INVOICE_GENERATE = 'order_approval_step_invoice_generate',
  ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS = 'order_approval_step_update_order_status'
}

export enum GroupIds {
  BASE_GROUP = 'invoice_hub_group',
  AUTH_SERVICE_GROUP = 'auth-service-group',

  INVOICE_SERVICE_GROUP = 'invoice-service-group',
  INVOICE_ORDER_FETCH_GROUP = 'invoice-order-fetch-group',
  INVOICE_USER_FETCH_GROUP = 'invoice-user-fetch-group',

  INVOICE_SERVICE_APP_GROUP = 'invoice-service-app-group',
  INVOICE_SERVICE_TRANSACTION_GROUP = 'invoice-service-transaction-group',

  ORDER_SERVICE_GROUP = 'order-service-group',
  ORDER_USER_FETCH_GROUP = 'order-user-fetch-group',

  ORDER_SERVICE_APP_GROUP = 'order-service-app-group',
  ORDER_SERVICE_TRANSACTION_GROUP = 'order-service-transaction-group'
}

export enum ClientIds {
  API_GATEWAY = 'Api Gateway',
  AUTH_SERVICE = 'Auth Service',
  INVOICE_SERVICE = 'Invoice Service',
  ORDER_SERVICE = 'Order Service'
}
