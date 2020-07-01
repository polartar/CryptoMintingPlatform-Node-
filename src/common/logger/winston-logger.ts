import * as winston from 'winston';
import * as dotenv from 'dotenv';
require('winston-mongodb');

dotenv.config({ path: '.env' });

const LEVEL = Symbol.for('level');
const MESSAGE = Symbol.for('message');

const logger = winston.createLogger();
const colorizer = winston.format.colorize();

if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
  logger.add(
    // @ts-ignore
    new winston.transports.MongoDB({
      format: winston.format.json(),
      level: process.env.LOG_LEVEL,
      db: process.env.MONGODB_URI,
      collection: 'wallet-logs',
      storeHost: true,
      capped: true,
      cappedMax: 5000,
    }),
  );
} else if (!!process.env.VSCODE_PID) {
  logger.add(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL,
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
      level: process.env.LOG_LEVEL,
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
