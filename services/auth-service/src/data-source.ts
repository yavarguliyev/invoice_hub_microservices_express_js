import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common-packages';

import User from 'domain/entities/user.entity';
import Role from 'domain/entities/role.entity';
import Permission from 'domain/entities/permission.entity';
import RolePermission from 'domain/entities/role-permission.entity';

export const AppDataSource = new DataSource(getDataSourceConfig(true, [User, Role, Permission, RolePermission]));
