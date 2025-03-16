import { CustomError } from './custom-error';
import { DatabaseConnectionDetails } from '../../domain/interfaces/error-request-details.interface';

export class DatabaseConnectionError extends CustomError<DatabaseConnectionDetails> {
  statusCode = 500;
  reason = 'Error connecting to the database';

  constructor (details?: DatabaseConnectionDetails) {
    super('Database connection error', details);
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  serializeErrors () {
    return [{ message: this.message, reason: this.reason, details: this.details }];
  }
}
