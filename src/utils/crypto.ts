import { config, logger } from '../common';
const SimpleCrypto = require('simple-crypto-js').default;
import { MD5, enc, SHA256 } from 'crypto-js';

class Crypto {
  public ERROR_INCORRECT_SECRET = 'Incorrect password';
  enc = enc;
  MD5 = MD5;
  public encrypt = (plainText: string, secret: string) => {
    logger.debug(
      `utils.crypto.encrypt.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`,
    );
    if (!config.clientSecretKeyRequired) return plainText;
    logger.debug('utils.crypto.encrypt:encrypting');
    const crypto = new SimpleCrypto(secret);
    return crypto.encrypt(plainText).toString();
  };

  public decrypt = (encryptedText: string, secret: string) => {
    logger.debug(
      `utils.crypto.decrypt.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`,
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
  };

  public md5UrlSafe = (value: string) => {
    return MD5(value)
      .toString(this.enc.Base64)
      .replace(/[^a-zA-Z0-9]/g, '');
  };

  public hash = (value: string) => {
    logger.debug('utils.crypto.hash');
    return SHA256(value).toString();
  };
}

export default new Crypto();
