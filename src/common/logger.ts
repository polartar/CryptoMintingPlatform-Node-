import * as winston from 'winston';
require('winston-mongodb');
import { config } from '../common';

const logger = winston.createLogger()


if (process.env.NODE_ENV === 'production' && config.mongodbUri) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: process.env.LOG_LEVEL_PROD,
      db: config.mongodbUri,
      collection: process.env.LOG_COLLECTION_PROD,
      storeHost: true,
    }),
  )


} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
      level: config.logLevel,
    }),
  )
}

export default logger;
