import { Expose } from 'class-transformer';

import { Roles } from 'domain/enums/roles.enum';

export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: Roles;
}
