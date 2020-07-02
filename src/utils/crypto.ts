import { config, logger } from '../common';
const SimpleCrypto = require('simple-crypto-js').default;
const LegacySimpleCrypto = require('@blockbrothers/legacy-simple-crypto')
  .default;
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
    const simpleCrypto = new SimpleCrypto(secret);
    return simpleCrypto.encrypt(plainText).toString();
  };

  public decrypt = (
    encryptedText: string,
    secret: string,
  ): {
    decryptedString: string;
    version: string;
    reEncryptedString?: string;
  } => {
    logger.debug(
      `utils.crypto.decrypt.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`,
    );
    if (!config.clientSecretKeyRequired) {
      return {
        decryptedString: encryptedText,
        version: 'N/A',
      };
    }
    logger.debug('utils.crypto.decrypt:decrypting');
    try {
      const decryptedString = new LegacySimpleCrypto(secret)
        .decrypt(encryptedText)
        .toString();
      if (decryptedString) {
        return {
          decryptedString,
          version: '2.0.2',
          reEncryptedString: this.encrypt(decryptedString, secret),
        };
      } else {
        throw new Error(this.ERROR_INCORRECT_SECRET);
      }
    } catch (error) {
      const decryptedString = new SimpleCrypto(secret)
        .decrypt(encryptedText)
        .toString();
      if (!decryptedString) {
        const error = new Error(this.ERROR_INCORRECT_SECRET);
        logger.warn(`utils.crypto.Crypto.decrypt.catch: ${error}`);
        throw error;
      }
      return {
        decryptedString,
        version: '2.5.0',
      };
    }
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

export const crypto = new Crypto();
