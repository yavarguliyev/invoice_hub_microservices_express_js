import { DataSource } from 'typeorm';

import { getDataSourceConfig } from 'core/configs/datasource.config';

export const AppDataSource = new DataSource(getDataSourceConfig(true));
