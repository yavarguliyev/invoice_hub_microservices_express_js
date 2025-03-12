import { getErrorMessage } from './utility-functions.helper';
import { RetryOptions } from '../../domain/interfaces/utility-functions-options.interface';
import { LoggerTracerInfrastructure } from '../../infrastructure/logging/logger-tracer.infrastructure';

export class RetryHelper {
  static async executeWithRetry<T> (fn: () => Promise<T>, { serviceName, maxRetries, retryDelay } : RetryOptions): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        LoggerTracerInfrastructure.log(`${serviceName} disconnected successfully`, 'info');
        return await fn();
      } catch (error) {
        const retryingMessage = `${serviceName} shutdown failed, retrying... (${attempt}/${maxRetries})`;
        const finalFailureMessage = `${serviceName} shutdown failed after ${maxRetries} attempts: ${getErrorMessage(error)}`;
        const logMessage = attempt < maxRetries ? retryingMessage : finalFailureMessage;

        LoggerTracerInfrastructure.log(logMessage, 'error');

        if (attempt === maxRetries) {
          throw error;
        }

        await this.delay(retryDelay);
      }
    }

    throw new Error(`Exceeded maximum retries for ${serviceName}`);
  }

  private static delay (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
