import { UserDto } from '../../domain/dtos/user.dto';

export type GenerateLoginResponse = {
  currentUser: UserDto;
}
