import * as winston from 'winston';
require('winston-mongodb');
import { config } from '..';

const logger = winston.createLogger();
const colorizer = winston.format.colorize();

if (process.env.NODE_ENV === 'production' && config.mongodbUri) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: process.env.LOG_LEVEL,
      db: config.mongodbUri,
      collection: 'wallet-logs',
      storeHost: true,
    }),
  );
} else {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.printf(
          msg =>
            colorizer.colorize(msg.level, `${msg.level}: `) + `${msg.message}`,
        ),
      ),
    }),
  );
}

export default logger;
