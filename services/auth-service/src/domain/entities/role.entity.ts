import { Column, Entity, OneToMany } from 'typeorm';
import { IsEnum } from 'class-validator';

import { Entities } from 'domain/enums/entities.enum';
import { Roles } from 'domain/enums/roles.enum';
import { BaseEntity } from 'domain/entities/base.entity';
import User from 'domain/entities/user.entity';

@Entity(Entities.ROLE)
export default class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 64, unique: true })
  @IsEnum(Roles)
  name: Roles;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
