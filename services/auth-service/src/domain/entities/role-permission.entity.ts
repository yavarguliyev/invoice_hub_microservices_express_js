import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '@invoice-hub/common-packages';

import { Entities } from 'domain/enums/entities.enum';
import Role from 'domain/entities/role.entity';
import Permission from 'domain/entities/permission.entity';

@Entity(Entities.ROLE_PERMISSION)
export default class RolePermission extends BaseEntity {
  @ManyToOne(() => Role, (role) => role.rolePermissions)
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions)
  permission: Permission;
}
