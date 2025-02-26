import { HandleProcessSignalsOptions } from '../../domain/interfaces/handle-process-signals-options.interface';
import { CreateVersionedRouteOptions } from '../../domain/interfaces/create-versioned-route-options.interface';
import { ContainerHelper } from '../ioc/helpers/container.helper';
import { RegisterServiceOptions } from '../../domain/interfaces/register-service-options.interface';

export const handleProcessSignals = <Args extends unknown[]> ({ shutdownCallback, callbackArgs }: HandleProcessSignalsOptions<Args>): void => {
  ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => process.on(signal, async () => await shutdownCallback(...callbackArgs)));
};

export const createVersionedRoute = ({ controllerPath, version }: CreateVersionedRouteOptions) => {
  return `/api/${version}${controllerPath}`;
};

export const registerService = <T> ({ id, service, isSingleton = true }: RegisterServiceOptions<T>): void => {
  isSingleton ? ContainerHelper.addSingleton<T>(id, service) : ContainerHelper.addTransient<T>(id, service);
};
