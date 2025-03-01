import { Middleware, ExpressErrorMiddlewareInterface } from 'routing-controllers';
import { Request, Response } from 'express';

import { CustomError } from '../errors';
import { ErrorWithValidation, ValidationError } from '../../domain/interfaces/error-handler-middleware.interface';

@Middleware({ type: 'after' })
export class ErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {
  error (error: Error, _req: Request, response: Response) {
    if (error instanceof CustomError) {
      return response.status(error.statusCode).json({ errors: error.serializeErrors() });
    }

    const validationErrors: ValidationError[] = [];

    if (this.isErrorWithValidation(error)) {
      error.errors?.forEach((e) => {
        validationErrors.push({
          property: e.property,
          constraints: e.constraints,
          reason: error.name
        });
      });
    }

    return response.status(400).json({ message: error.message, details: validationErrors });
  }

  private isErrorWithValidation (error: Error): error is ErrorWithValidation {
    return 'errors' in error && Array.isArray((error as ErrorWithValidation).errors);
  }
}
