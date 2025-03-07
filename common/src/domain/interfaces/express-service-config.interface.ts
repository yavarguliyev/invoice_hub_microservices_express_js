export interface ExpressServerConfig {
  controllers: Function[];
  middlewares?: Function[];
  proxies?: { path: string; target: string }[];
}
