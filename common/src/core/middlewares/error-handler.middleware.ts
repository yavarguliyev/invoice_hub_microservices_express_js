import { Middleware, ExpressErrorMiddlewareInterface } from 'routing-controllers';
import { Request, Response, NextFunction } from 'express';

import { CustomError } from '../errors';
import { ErrorWithValidation, ValidationError } from '../../domain/interfaces/error-handler-middleware.interface';

const handleErrorResponse = (error: Error, response: Response) => {
  if (error instanceof CustomError) {
    return response.status(error.statusCode).json({ errors: error.serializeErrors() });
  }

  const validationErrors: ValidationError[] = [];

  if ('errors' in error && Array.isArray((error as ErrorWithValidation).errors)) {
    (error as ErrorWithValidation).errors?.forEach((e) => {
      validationErrors.push({ property: e.property, constraints: e.constraints, reason: error.name });
    });
  }

  return response.status(400).json({ message: error.message, details: validationErrors });
};

@Middleware({ type: 'after' })
export class GlobalErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {
  error (error: Error, _req: Request, response: Response, _next: NextFunction) {
    if (!response.headersSent) {
      return handleErrorResponse(error, response);
    }

    return;
  }
}

export const globalErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (!res.headersSent) {
    return handleErrorResponse(err, res);
  }

  return;
};
