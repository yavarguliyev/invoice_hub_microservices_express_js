export interface RetryOptions {
  serviceName: string;
  maxRetries: number;
  retryDelay: number;
  onRetry?: (attempt: number) => void;
  onFailure?: (error: Error, attempt: number) => void;
};
