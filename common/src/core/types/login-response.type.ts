import { ResultMessage } from '../../domain/enums/result-message.enum';
import { UserDto } from '../../domain/dtos/user.dto';

export type LoginResponse = {
  accessToken: string;
  payload: {
    currentUser: UserDto
  };
  results: ResultMessage;
}
