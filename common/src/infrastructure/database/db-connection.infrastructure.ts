import { DataSource } from 'typeorm';
import { DbBaseOptions, DbRequestOptions } from '../../domain/interfaces/db-request-options.interface';
import { ClientIds } from '../../domain/enums/events.enum';

export class DbConnectionInfrastructure {
  private dataSourceMap: Map<ClientIds, DataSource>;

  constructor () {
    this.dataSourceMap = new Map();
  }

  create ({ clientId, dataSourceOptions }: DbRequestOptions) {
    if (!this.dataSourceMap.has(clientId)) {
      this.dataSourceMap.set(clientId, new DataSource(dataSourceOptions));
    }

    return this.dataSourceMap.get(clientId)!;
  }

  async disconnect ({ clientId }: DbBaseOptions) {
    const dataSource = this.dataSourceMap.get(clientId);

    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      this.dataSourceMap.delete(clientId);
    }
  }

  isConnected ({ clientId }: DbBaseOptions) {
    const dataSource = this.dataSourceMap.get(clientId);
    return dataSource ? dataSource.isInitialized : false;
  }

  getDataSource ({ clientId }: DbBaseOptions) {
    return this.dataSourceMap.get(clientId);
  }
}
