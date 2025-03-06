import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common';

import { User } from 'domain/entities/user.entity';
import { Role } from 'domain/entities/role.entity';

export const AppDataSource = new DataSource(getDataSourceConfig(true, [User, Role]));
