import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common-packages';

import Order from 'domain/entities/order.entity';

export const AppDataSource = new DataSource(getDataSourceConfig(true, [Order]));
