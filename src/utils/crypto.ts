import { config, logger } from '../common';
import autoBind = require('auto-bind');
const SimpleCrypto = require('simple-crypto-js').default;
const SHA256 = require('crypto-js/sha256');

class Crypto {
  public ERROR_INCORRECT_SECRET = 'Incorrect password';
  constructor() {
    autoBind(this);
  }
  public encrypt(plainText: string, secret: string) {
    logger.debug(
      `utils.crypto.encrypt.config.clientSecretKeyRequired:${
        config.clientSecretKeyRequired
      }`,
    );
    if (!config.clientSecretKeyRequired) return plainText;
    logger.debug('utils.crypto.encrypt:encrypting');
    const crypto = new SimpleCrypto(secret);
    return crypto.encrypt(plainText).toString();
  }

  public decrypt(encryptedText: string, secret: string) {
    logger.debug(
      `utils.crypto.decrypt.config.clientSecretKeyRequired:${
        config.clientSecretKeyRequired
      }`,
    );
    if (!config.clientSecretKeyRequired) return encryptedText;
    logger.debug('utils.crypto.decrypt:decrypting');
    const decryptedString = new SimpleCrypto(secret)
      .decrypt(encryptedText)
      .toString();
    if (!decryptedString) {
      const error = new Error(this.ERROR_INCORRECT_SECRET);
      logger.warn(`utils.crypto.Crypto.decrypt.catch: ${error}`);
      throw error;
    }
    return decryptedString;
  }

  public hash(value: string) {
    logger.debug('utils.crypto.hash');
    return SHA256(value).toString();
  }
}

export default new Crypto();
