import * as winston from 'winston';
import { config } from '../';
require('winston-mongodb');

const LEVEL = Symbol.for('level');
const MESSAGE = Symbol.for('message');

const logger = winston.createLogger();
const colorizer = winston.format.colorize();

const nodeEnv = config.nodeEnv; // env.NODE_ENV;
//const brand = config.brand; //env.BRAND;
const mongoDBUri = config.mongodbUri; //'MONGODB_URI_' + brand.toUpperCase();
const logLevel = config.logLevel; //env.LOG_LEVEL;

if (nodeEnv === 'production' && mongoDBUri) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: logLevel,
      db: mongoDBUri,
      collection: 'wallet-logs',
      storeHost: true,
      capped: true,
      cappedMax: 5000,
    }),
  );
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: 'warn',
      db: mongoDBUri,
      collection: 'wallet-logs-error',
      storeHost: true,
      capped: true,
      cappedMax: 10000,
    }),
  );
} else if (!!config.vscodePid) {
  logger.add(
    new winston.transports.Console({
      level: logLevel,
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.printf(
          msg =>
            colorizer.colorize(msg.level, `${msg.level}: `) + `${msg.message}`,
        ),
      ),
      log(info, callback) {
        // tslint:disable-next-line:no-invalid-this
        setImmediate(() => this.emit('logged', info));
        // tslint:disable-next-line:no-invalid-this
        if (this.stderrLevels[info[LEVEL]]) {
          console.error(info[MESSAGE]);

          if (callback) {
            callback();
          }
          return;
        }

        console.log(info[MESSAGE]);

        if (callback) {
          callback();
        }
      },
    }),
  );
} else {
  logger.add(
    new winston.transports.Console({
      level: logLevel,
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
