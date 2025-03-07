import { DataSource } from 'typeorm';

import { DbConnectionConfig } from '../domain/interfaces/db-connection-config.interface';
import { ServicesName } from '../domain/enums/services-names.enum';

export class DbConnectionInfrastructure {
  private static dataSourceMap: Map<ServicesName, DataSource> = new Map();

  static create ({ serviceName, dataSourceOptions }: DbConnectionConfig): DataSource {
    if (!this.dataSourceMap.has(serviceName)) {
      this.dataSourceMap.set(serviceName, new DataSource(dataSourceOptions));
    }

    return this.dataSourceMap.get(serviceName)!;
  }

  static async disconnect (serviceName: ServicesName): Promise<void> {
    const dataSource = this.dataSourceMap.get(serviceName);

    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      this.dataSourceMap.delete(serviceName);
    }
  }

  static isConnected (serviceName: ServicesName): boolean {
    const dataSource = this.dataSourceMap.get(serviceName);
    return dataSource ? dataSource.isInitialized : false;
  }

  static getDataSource(serviceName: ServicesName): DataSource | undefined {
    return this.dataSourceMap.get(serviceName);
  }
}
