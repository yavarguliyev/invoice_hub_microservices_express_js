import { Expose } from 'class-transformer';

import { RoleDto } from 'domain/dto/role.dto';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  role: RoleDto;
}
