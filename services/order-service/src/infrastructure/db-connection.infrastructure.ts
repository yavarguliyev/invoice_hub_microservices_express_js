import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { getDataSourceConfig } from 'configs/datasource.config';

export class DbConnectionInfrastructure {
  private static dataSource?: DataSource;

  static create (): DataSource {
    if (!this.dataSource) {
      this.dataSource = new DataSource(getDataSourceConfig());
    }

    return this.dataSource;
  }

  static async disconnect (): Promise<void> {
    if (this?.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      delete this.dataSource;
    }
  }

  static isConnected (): boolean {
    return !!this.dataSource?.isInitialized;
  }

  static getDataSource (): DataSource | undefined {
    return this.dataSource;
  }
}
