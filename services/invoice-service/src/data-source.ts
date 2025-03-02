import { DataSource } from 'typeorm';

import { getDataSourceConfig } from 'configs/datasource.config';

export const AppDataSource = new DataSource(getDataSourceConfig(true));
