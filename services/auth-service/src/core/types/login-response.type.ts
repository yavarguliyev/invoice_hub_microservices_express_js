import { ResultMessage, UserDto } from '@invoice-hub/common';

export type LoginResponse = {
  accessToken: string;
  payload: {
    currentUser: UserDto
  };
  results: ResultMessage;
}
