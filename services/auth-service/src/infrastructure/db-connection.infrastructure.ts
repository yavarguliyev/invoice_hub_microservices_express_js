import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common';

import { User } from 'domain/entities/user.entity';
import { Role } from 'domain/entities/role.entity';

export class DbConnectionInfrastructure {
  private static dataSource?: DataSource;

  static create (): DataSource {
    if (!this.dataSource) {
      this.dataSource = new DataSource(getDataSourceConfig(false, [User, Role]));
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
