import { Column, Entity, OneToMany } from 'typeorm';
import { IsEnum } from 'class-validator';

import { Entities } from 'domain/enums/entities.enum';
import { BaseEntity } from 'domain/entities/base.entity';
import { Permissions } from 'domain/enums/permission.enum';
import RolePermission from 'domain/entities/role-permission.entity';

@Entity(Entities.PERMISSION)
export default class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  @IsEnum(Permissions)
  name: Permissions;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  rolePermissions: RolePermission[];
}
