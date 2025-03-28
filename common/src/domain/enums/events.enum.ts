export enum Subjects {
  FETCH_USER_REQUEST = 'fetch-user-request',
  FETCH_USER_RESPONSE = 'fetch-user-response',

  ORDER_CREATED = 'order-created',
  ORDER_CANCELED = 'order-canceled',
  FETCH_ORDER_REQUEST = 'fetch-order-request',
  FETCH_ORDER_RESPONSE = 'fetch-order-response',

  ORDER_APPROVAL_STEP_GENERATE_INVOICE = 'order_approval-step-generate_invoice',
  ORDER_APPROVAL_STEP_UPDATE_ORDER_STATUS = 'order_approval-step-update_order_status',
  ORDER_APPROVAL_COMPENSATE_GENERATE_INVOICE = 'order_approval-compensate-generate_invoice',
  ORDER_APPROVAL_COMPENSATE_UPDATE_ORDER_STATUS = 'order_approval-compensate-update_order_status',

  UPDATE_ORDER_STATUS = 'update_order_status',

  INVOICE_GENERATE = 'invoice-generate',
  
  TRANSACTION_START = 'transaction-start',
  TRANSACTION_STEP_COMPLETED = 'transaction-step-completed',
  TRANSACTION_STEP_FAILED = 'transaction-step-failed',
  TRANSACTION_COMPLETED = 'transaction-completed',
  TRANSACTION_FAILED = 'transaction-failed',
  TRANSACTION_COMPENSATION_START = 'transaction-compensation-start',
  TRANSACTION_COMPENSATION_COMPLETED = 'transaction-compensation-completed',
  TRANSACTION_TIMEOUT = 'transaction-timeout',
  
  ORDER_APPROVAL_PROCESS_START = 'order-approval-process-start',
  ORDER_STATUS_CHANGED = 'order-status-changed',
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
  API_GATEWAY = 'api-gateway',
  AUTH_SERVICE = 'auth-service',
  INVOICE_SERVICE = 'invoice-service',
  ORDER_SERVICE = 'order-service'
}
