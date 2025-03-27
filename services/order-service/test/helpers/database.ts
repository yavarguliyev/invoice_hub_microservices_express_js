import { Container } from 'typedi';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DbConnectionInfrastructure } from '@invoice-hub/common';

import { entities } from '../../src/application/helpers/container-config.helper';

let testDataSource: DataSource;

export async function setupTestDatabase (): Promise<void> {
  try {
    const mockDbConnection = new DbConnectionInfrastructure();

    const testDataSourceConfig: DataSourceOptions = {
      type: 'postgres',
      host: process.env.DB_TEST_HOST || 'localhost',
      port: Number(process.env.DB_TEST_PORT || 5432),
      username: process.env.DB_TEST_USERNAME || 'postgres',
      password: process.env.DB_TEST_PASSWORD || 'postgres',
      database: process.env.DB_TEST_DATABASE || 'order_service_test',
      entities,
      synchronize: true,
      dropSchema: true,
      logging: false
    };

    const mockDataSource = new DataSource(testDataSourceConfig);

    await mockDataSource.initialize();

    testDataSource = mockDataSource;

    mockDbConnection.create = jest.fn().mockReturnValue(mockDataSource);
    mockDbConnection.getDataSource = jest.fn().mockReturnValue(mockDataSource);

    Container.set(DbConnectionInfrastructure, mockDbConnection);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function clearTestData (): Promise<void> {
  if (testDataSource && testDataSource.isInitialized) {
    try {
      const entityMetadatas = testDataSource.entityMetadatas;
      for (const entity of entityMetadatas) {
        const repository = testDataSource.getRepository(entity.name);
        await repository.clear();
      }
    } catch (error) {
      console.error('Failed to clear test data:', error);
    }
  }
}

export async function closeTestDatabase (): Promise<void> {
  if (testDataSource && testDataSource.isInitialized) {
    try {
      await testDataSource.destroy();
    } catch (error) {
      console.error('Failed to close test database:', error);
    }
  }
}
