import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common';

import { Invoice } from 'domain/entities/invoice.entity';

export const AppDataSource = new DataSource(getDataSourceConfig(true, [Invoice]));
