import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common-packages';

import Order from 'domain/entities/order.entity';

export class DbConnectionInfrastructure {
  private static dataSource?: DataSource;

  static create (): DataSource {
    if (!this.dataSource) {
      this.dataSource = new DataSource(getDataSourceConfig(false, [Order]));
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
