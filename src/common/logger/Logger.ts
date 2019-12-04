import { Logger as WinstonLogger } from 'winston';
import { v4 as randomString } from 'uuid';
import autoBind = require('auto-bind');

interface IKeyValues {
  [key: string]: string | number | boolean;
}

export default class Logger {
  logger: WinstonLogger;
  meta: IKeyValues;

  constructor(logger: WinstonLogger, initialMetadata: IKeyValues = {}) {
    autoBind(this);
    this.logger = logger;
    this.meta = initialMetadata;
  }

  startSession(userId?: string) {
    if (userId) {
      this.meta.userId = userId;
    }
    this.meta.session = randomString();
  }
  setModule(moduleName: string) {
    this.meta.module = moduleName;
  }
  setMethod(methodName: string) {
    return new Logger(this.logger, { ...this.meta, method: methodName });
  }
  setResolverType(resolverType: string) {
    this.meta.resolverType = resolverType;
  }
  setResolverName(resolverName: string) {
    this.meta.resolverName = resolverName;
  }
  error(message: string) {
    this.logger.error(message, { meatadata: this.meta });
  }
  warn(message: string) {
    this.logger.warn(message, { meatadata: this.meta });
  }
  info(message: string) {
    this.logger.info(message, { meatadata: this.meta });
  }
  debug(message: string) {
    this.logger.debug(message, { meatadata: this.meta });
  }
  verbose(message: string) {
    this.logger.verbose(message, { meatadata: this.meta });
  }
  silly(message: string) {
    this.logger.silly(message, { meatadata: this.meta });
  }

  private logKeyValues(
    keyValues: IKeyValues,
    loggingFunction: (message: string) => void,
  ) {
    if (typeof keyValues !== 'object') {
      this.error(`${keyValues} is not an object`);
    }
    Object.entries(keyValues).forEach(([key, value]) => {
      loggingFunction(`${key}: ${value}`);
    });
  }

  get obj() {
    return {
      error: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.error);
      },
      warn: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.warn);
      },
      info: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.info);
      },
      debug: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.debug);
      },
      verbose: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.verbose);
      },
      silly: (keyValPair: IKeyValues) => {
        this.logKeyValues(keyValPair, this.silly);
      },
    };
  }

  get JSON() {
    return {
      error: (keyValPair: Object) => {
        this.error(JSON.stringify(keyValPair));
      },
      warn: (keyValPair: Object) => {
        this.warn(JSON.stringify(keyValPair));
      },
      info: (keyValPair: Object) => {
        this.info(JSON.stringify(keyValPair));
      },
      debug: (keyValPair: Object) => {
        this.debug(JSON.stringify(keyValPair));
      },
      verbose: (keyValPair: Object) => {
        this.verbose(JSON.stringify(keyValPair));
      },
      silly: (keyValPair: Object) => {
        this.silly(JSON.stringify(keyValPair));
      },
    };
  }
}
