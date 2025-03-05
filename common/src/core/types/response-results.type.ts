import { ResultMessage } from '../../domain';

export type ResponseResults<T> = {
  payloads?: T[];
  payload?: T;
  total?: number;
  result: ResultMessage;
};
