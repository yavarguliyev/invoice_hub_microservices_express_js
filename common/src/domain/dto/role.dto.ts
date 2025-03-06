import { Expose } from 'class-transformer';

import { Roles } from '../enums/roles.enum';

export class RoleDto {
  @Expose()
  name: Roles;
}
