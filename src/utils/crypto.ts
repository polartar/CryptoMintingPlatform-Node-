import { config } from '../common';
const SimpleCrypto = require('simple-crypto-js').default;
const SHA256 = require('crypto-js/sha256')

class Crypto {
  public encrypt(plainText: string, secret: string) {
    if (!config.clientSecretKeyRequired) return plainText;
    const crypto = new SimpleCrypto(secret);
    return crypto.encrypt(plainText).toString()
  }

  public decrypt(encryptedText: string, secret: string) {
    if (!config.clientSecretKeyRequired) return encryptedText;
    const decryptedString = new SimpleCrypto(secret).decrypt(encryptedText).toString()
    if (!decryptedString) throw new Error('Incorrect password');
    return decryptedString
  }

  public hash(value: string) {
    return SHA256(value);
  }
}

export default new Crypto();
