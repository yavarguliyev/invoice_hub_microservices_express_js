import 'reflect-metadata';
import { LoggerTracerInfrastructure, getErrorMessage, ServerBootstrapper } from '@invoice-hub/common';

import { appConfig } from 'application/helpers/container-config.helper';

process.on('uncaughtException', (error) => {
  LoggerTracerInfrastructure.log(`Uncaught exception: ${getErrorMessage(error)}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  LoggerTracerInfrastructure.log(`Unhandled rejection: ${getErrorMessage(reason)}`, 'error');
  process.exit(1);
});

ServerBootstrapper.start(appConfig);
