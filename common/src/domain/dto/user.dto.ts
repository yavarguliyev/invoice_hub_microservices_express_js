import { Expose } from 'class-transformer';

import { RoleDto } from './role.dto';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  role: RoleDto;
}
