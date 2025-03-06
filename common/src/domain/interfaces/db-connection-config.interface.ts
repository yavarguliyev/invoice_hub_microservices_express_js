import { DataSourceOptions } from 'typeorm';

import { DBServicesName } from '../enums/db-services-names.enum';

export interface DbConnectionConfig {
  serviceName: DBServicesName;
  dataSourceOptions: DataSourceOptions;
}
