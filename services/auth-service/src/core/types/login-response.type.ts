import { ResultMessage } from '@invoice-hub/common';

export type LoginResponse = {
  accessToken: string;
  payload: {
    id: string,
    email: string
  };
  results: ResultMessage;
}
