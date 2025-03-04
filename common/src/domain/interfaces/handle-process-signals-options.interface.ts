export interface HandleProcessSignalsOptions<Args extends unknown[]> {
  shutdownCallback: (...args: Args) => Promise<void>;
  callbackArgs: Args;
};
