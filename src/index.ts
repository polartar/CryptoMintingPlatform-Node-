import server from './server';
import * as Sentry from '@sentry/node';
import { config } from './common';
import { default as errorHandler } from './errors';

Sentry.init({
  dsn: config.sentryDsn,
  environment: config.isStage ? 'staging' : 'production',
});

server.initialize();

// get the unhandled rejection and throw it to another fallback handler we already have.
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  throw reason;
 });
  
 process.on('uncaughtException', (error: Error) => {
  errorHandler.handleError(error);
  if (!errorHandler.isTrustedError(error)) {
    process.exit(1);
  }
 });
