import { config } from 'dotenv';
import { DataSourceOptions, EntitySchema, EntityTarget } from 'typeorm';

config();

export const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_DEFAULT_HOST,
  port: Number(process.env.DB_DEFAULT_PORT),
  username: process.env.DB_DEFAULT_USERNAME,
  password: process.env.DB_DEFAULT_PASSWORD,
  database: process.env.DB_DEFAULT_DATABASE,
  synchronize: false,
  logging: false,
  subscribers: []
} as const;

export const getDataSourceConfig = <T>(includeMigrations = false, entities: EntityTarget<T>[] = []): DataSourceOptions => {
  return includeMigrations
    ? { ...baseConfig, entities: entities as (string | Function | EntitySchema<T>)[], migrations: ['migrations/*.ts'] }
    : { ...baseConfig, entities: entities as (string | Function | EntitySchema<T>)[] };
};
