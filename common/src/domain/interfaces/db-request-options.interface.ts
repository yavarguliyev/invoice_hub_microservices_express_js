import { DataSourceOptions } from 'typeorm';

import { ClientIds } from '../enums/events.enum';

export interface DbBaseOptions {
  clientId: ClientIds;
}

export interface DbRequestOptions extends DbBaseOptions {
  dataSourceOptions: DataSourceOptions;
}
