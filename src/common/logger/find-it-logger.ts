import logger from './winston-logger';

export const logDebug = (
  methodName: string,
  label: string,
  value: string | number | boolean,
  meta?: { [key: string]: string | number },
) => {
  if (meta) {
    logger.silly(`+++++${methodName}::${label}=${value}`, { meta });
  } else {
    logger.silly(`+++++${methodName}::${label}=${value}`);
  }
};
