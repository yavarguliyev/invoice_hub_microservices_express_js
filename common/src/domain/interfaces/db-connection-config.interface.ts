import { DataSourceOptions } from 'typeorm';

import { ServicesName } from '../enums/services-names.enum';

export interface DbConnectionConfig {
  serviceName: ServicesName;
  dataSourceOptions: DataSourceOptions;
}
