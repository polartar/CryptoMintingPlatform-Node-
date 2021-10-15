import server from './server';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { config } from './common';
import { default as errorHandler } from './errors';

Sentry.init({
  dsn: config.sentryDsn,
  environment: config.isProd ? 'production' : 'staging',
  attachStacktrace: true,
  initialScope: scope => {
    scope.setTag('brand', config.brand);
    return scope;
  },
});

server.initialize();

// get the unhandled rejection and throw it to another fallback handler we already have.
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  Sentry.captureException(reason);
  throw reason;
});

process.on('uncaughtException', (error: Error) => {
  Sentry.captureException(error);
  errorHandler.handleError(error);
  if (!errorHandler.isTrustedError(error)) {
    process.exit(1);
  }
});
