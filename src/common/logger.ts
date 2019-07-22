import * as winston from 'winston';
require('winston-mongodb');
import { config } from '../common';

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

if (process.env.NODE_ENV === 'production' && config.mongodbUri) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      level: 'error',
      db: config.mongodbUri,
      collection: 'error-logs',
      storeHost: true,
    }),
  );
}

export default logger;
