import { ValidationError as ExpressValidationError } from 'express-validator';

export interface BadRequestDetails {
  errorField?: string | number;
  hint?: string;
};

export interface ValidationError {
  property: string;
  constraints: Record<string, string>;
  reason: string;
}

export interface ErrorWithValidation extends Error {
  errors?: ValidationError[];
};

export interface NotAuthorizedDetails {
  requiredPermissions?: string[];
};

export interface NotFoundDetails {
  resourceId?: string | number;
};

export interface ValidationErrorDetails {
  field?: string;
  errorMessage?: string;
};

export function isValidationErrorWithParam (error: ExpressValidationError): error is ExpressValidationError & { param: string } {
  return 'param' in error;
}

export interface DatabaseConnectionDetails {
  host?: string;
  dbName?: string;
};

export interface ValidationError {
  property: string;
  constraints: Record<string, string>;
  reason: string;
}

export interface ErrorWithValidation extends Error {
  errors?: ValidationError[];
};

