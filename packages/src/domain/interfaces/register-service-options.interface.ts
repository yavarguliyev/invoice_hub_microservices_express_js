import { Constructable } from 'typedi';

export interface RegisterServiceOptions<T> {
  id: string;
  service: Constructable<T>;
  isSingleton?: boolean;
};
