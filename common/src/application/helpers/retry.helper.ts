import { RetryOptions } from '../../domain';
import { LoggerTracerInfrastructure } from '../../infrastructure';

export class RetryHelper {
  static async executeWithRetry<T> (fn: () => Promise<T>, { serviceName, maxRetries, retryDelay } : RetryOptions): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        LoggerTracerInfrastructure.log(`${serviceName} disconnected successfully`, 'info');
        return await fn();
      } catch (err) {
        LoggerTracerInfrastructure.log(
          attempt < maxRetries
            ? `${serviceName} shutdown failed, retrying... (${attempt}/${maxRetries})`
            : `${serviceName} shutdown failed after ${maxRetries} attempts: ${err}`,
          'error'
        );
        if (attempt === maxRetries) throw err;
        await this.delay(retryDelay);
      }
    }

    throw new Error(`Exceeded maximum retries for ${serviceName}`);
  }

  private static delay (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
