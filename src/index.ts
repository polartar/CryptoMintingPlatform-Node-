import server from './server';
import * as Sentry from '@sentry/node';
import { config } from './common';

Sentry.init({
  dsn: config.sentryDsn,
  environment: config.isStage ? 'staging' : 'production',
});

server.initialize();
