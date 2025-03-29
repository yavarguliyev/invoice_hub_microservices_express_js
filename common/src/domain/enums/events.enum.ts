export enum Subjects {
  FETCH_USER_REQUEST = 'fetch-user-request',
  FETCH_USER_RESPONSE = 'fetch-user-response',

  FETCH_ORDER_REQUEST = 'fetch-order-request',
  FETCH_ORDER_RESPONSE = 'fetch-order-response',
  
  FETCH_INVOICE_REQUEST = 'fetch-invoice-request',
  FETCH_INVOICE_RESPONSE = 'fetch-invoice-response',

  ORDER_APPROVAL_STEP_GENERATE_INVOICE = 'order_approval-step-generate_invoice',
  ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS = 'order_approval-step-update_order_status',
  ORDER_APPROVAL_STEP_INVOICE_GENERATE = 'order_approval-step-invoice-generate',
  ORDER_APPROVAL_COMPENSATE_INVOICE_GENERATE = 'order_approval-compensate-invoice-generate',
  ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS = 'order_approval-compensate-update_order_status',

  UPDATE_ORDER_STATUS = 'update_order_status',

  INVOICE_GENERATE = 'invoice-generate',
  INVOICE_GENERATION_SUCCESS = 'invoice-generation-success',
  
  TRANSACTION_START = 'transaction-start',
  TRANSACTION_STEP_COMPLETED = 'transaction-step-completed',
  TRANSACTION_STEP_FAILED = 'transaction-step-failed',
  TRANSACTION_COMPLETED = 'transaction-completed',
  TRANSACTION_FAILED = 'transaction-failed',
  TRANSACTION_COMPENSATION_START = 'transaction-compensation-start',
  TRANSACTION_COMPENSATION_COMPLETED = 'transaction-compensation-completed',
  TRANSACTION_TIMEOUT = 'transaction-timeout',
  
  INVOICE_GENERATION_FAILED = 'invoice-generation-failed',
  ORDER_STATUS_REVERTED = 'order-status-reverted'
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
  API_GATEWAY = 'Api Gateway',
  AUTH_SERVICE = 'Auth Service',
  INVOICE_SERVICE = 'Invoice Service',
  ORDER_SERVICE = 'Order Service'
}
