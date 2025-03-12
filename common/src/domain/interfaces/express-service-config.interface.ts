import { ClientIds } from '../../domain/enums/events.enum';

export interface ExpressServerBaseOptions {
  clientId: ClientIds;
}

export interface ExpressServerRequestOptions {
  controllers: Function[];
  middlewares?: Function[];
  proxies?: { path: string; target: string }[];
}
