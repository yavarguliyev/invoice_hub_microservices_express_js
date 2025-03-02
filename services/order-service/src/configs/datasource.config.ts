import dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';

import Order from 'domain/entities/order.entity';

dotenv.config();

export const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_DEFAULT_HOST,
  port: Number(process.env.DB_DEFAULT_PORT),
  username: process.env.DB_DEFAULT_USERNAME,
  password: process.env.DB_DEFAULT_PASSWORD,
  database: process.env.DB_DEFAULT_DATABASE,
  entities: [Order],
  synchronize: false,
  logging: false,
  subscribers: []
};

export const getDataSourceConfig = (includeMigrations = false): DataSourceOptions => {
  return includeMigrations
    ? { ...baseConfig, migrations: ['migrations/*.ts'] }
    : { ...baseConfig };
};
