import logger from './winston-logger';

export const logDebug = (
  methodName: string,
  label: string,
  value: string | number | boolean,
  meta?: { [key: string]: string | number },
) => {
  if (meta) {
    console.log(`+++++${methodName}::${label}=${value}`);
  } else {
    console.log(`+++++${methodName}::${label}=${value}`);
  }
};
