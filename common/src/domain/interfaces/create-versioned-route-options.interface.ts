import { Version } from '../../core/types/version-control.type';

export interface CreateVersionedRouteOptions {
  controllerPath: string;
  version: Version;
};
