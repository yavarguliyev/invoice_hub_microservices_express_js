export interface ServiceInitializationOptions {
  serviceName: string;
  initializeFn: () => Promise<void>;
};
