import * as winston from 'winston';
import { env } from '../env';
require('winston-mongodb');

const LEVEL = Symbol.for('level');
const MESSAGE = Symbol.for('message');

const logger = winston.createLogger();
const colorizer = winston.format.colorize();

if (env.NODE_ENV === 'production' && env.MONGODB_URI) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: env.LOG_LEVEL,
      db: env.MONGODB_URI,
      collection: 'wallet-logs',
      storeHost: true,
      capped: true,
      cappedMax: 5000,
    }),
  );
} else if (!!env.VSCODE_PID) {
  logger.add(
    new winston.transports.Console({
      level: env.LOG_LEVEL,
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
      level: env.LOG_LEVEL,
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
