import { Expose } from 'class-transformer';
import { Roles } from '@invoice-hub/common';

export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: Roles;
}
