import { ValidationError } from 'express-validator';

export interface ValidationErrorDetails {
  field?: string;
  errorMessage?: string;
};

export function isValidationErrorWithParam (error: ValidationError): error is ValidationError & { param: string } {
  return 'param' in error;
}
