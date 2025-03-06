import { CustomError } from './custom-error';
import { BadRequestDetails } from '../../domain/interfaces/bad-request-details.interface';

class BadRequestError extends CustomError<BadRequestDetails> {
  statusCode = 400;
  reason = 'Bad request';

  constructor (message: string, details?: BadRequestDetails) {
    super(message, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeErrors () {
    return [{ message: this.message, reason: this.reason, details: this.details }];
  }
}

export { BadRequestError };
