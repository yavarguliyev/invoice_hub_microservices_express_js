import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Length, IsEmail, IsString } from 'class-validator';
import { BaseEntity, PasswordStrengthDecorator } from '@invoice-hub/common-packages';
import bcrypt from 'bcrypt';

import { Entities } from 'domain/enums/entities.enum';
import Role from 'domain/entities/role.entity';

@Entity(Entities.USER)
export default class User extends BaseEntity {
  @Column({ type: 'varchar', length: 128, unique: true })
  @Length(8, 128)
  @IsEmail()
  email: string;

  @Column({ name: 'first_name', type: 'varchar', length: 128 })
  @IsString()
  @Length(3, 64)
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 64 })
  @IsString()
  @Length(3, 64)
  lastName: string;

  @Column()
  @IsString()
  @Length(8, 256, { message: 'Password must be between 8 and 256 characters.' })
  @PasswordStrengthDecorator()
  password: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword (): Promise<void> {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
