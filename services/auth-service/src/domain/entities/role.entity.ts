import { Column, Entity, OneToMany } from 'typeorm';
import { IsEnum } from 'class-validator';

import { Entities } from 'domain/enums/entities.enum';
import { Roles } from 'domain/enums/roles.enum';
import { BaseEntity } from 'domain/entities/base.entity';
import User from 'domain/entities/user.entity';
import RolePermission from 'domain/entities/role-permission.entity';

@Entity(Entities.ROLE)
export default class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  @IsEnum(Roles)
  name: Roles;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];
}
