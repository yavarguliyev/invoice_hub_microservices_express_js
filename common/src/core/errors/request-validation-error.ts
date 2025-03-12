import { ValidationError } from 'express-validator';

import { CustomError } from './custom-error';
import { isValidationErrorWithParam, ValidationErrorDetails } from '../../domain/interfaces/error-request-details.interface';

class RequestValidationError extends CustomError<ValidationErrorDetails[]> {
  statusCode = 400;
  reason = 'Validation failed';

  constructor (public errors: ValidationError[], details?: ValidationErrorDetails[]) {
    super('Invalid request parameters', details);
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors () {
    return this.errors.map((error) => {
      return {
        message: error.msg,
        field: isValidationErrorWithParam(error) ? error.param : undefined,
        reason: this.reason,
        details: this.details
      };
    });
  }
}

export { RequestValidationError };
