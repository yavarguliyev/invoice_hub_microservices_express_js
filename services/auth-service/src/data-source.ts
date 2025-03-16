import { DataSource } from 'typeorm';
import { getDataSourceConfig } from '@invoice-hub/common';

import { entities } from 'application/helpers/container-config.helper';

export const AppDataSource = new DataSource(getDataSourceConfig(true, entities));
