// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../../types';
import { UserApi } from '../../data-sources';
import SimpleCrypto from 'simple-crypto-js'
import { config } from '../../common';
import { SHA256 } from 'crypto-js'
export default abstract class CoinWalletBase {
  constructor(
    protected name: string,
    public symbol: string,
    protected contractAddress: string,
    protected abi: any,
    protected backgroundColor: string,
    protected icon: string,
  ) {
    if (!name)
      throw new Error(
        'No name provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!symbol)
      throw new Error(
        'No symbol provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!backgroundColor)
      throw new Error(
        'No backgroundColor provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!icon)
      throw new Error(
        'No icon provided in token configuration for wallet interface. This parameter is required.',
      );
  }

  protected encrypt(plainTextValue: string, secret: string) {
    if (!config.clientSecretKeyRequired) return plainTextValue
    const crypto = new SimpleCrypto(secret);
    return crypto.encrypt(plainTextValue);
  }

  protected decrypt(maybeEncryptedValue: string, secret: string) {
    if (!config.clientSecretKeyRequired) return maybeEncryptedValue
    const crypto = new SimpleCrypto(secret);
    return crypto.decrypt(maybeEncryptedValue)
  }

  protected hash(value: string) {
    return SHA256(value).toString()
  }

  abstract createWallet(userApi: UserApi, passphrase: string, mnemonic: string): Promise<boolean>;

  abstract getWalletInfo(
    userApi: UserApi,
  ): Promise<{
    receiveAddress: string;
    symbol: string;
    name: string;
    icon: string;
    backgroundColor: string;
  }>;

  abstract getBalance(
    addressOrUserId: string,
  ): Promise<{
    confirmed: string;
    unconfirmed: string;
  }>;

  abstract getTransactions(addressOrUserId: string, blockNumberAtCreation?: number): Promise<ITransaction[]>;

  abstract estimateFee(userApi: UserApi): Promise<string>;

  abstract send(
    userApi: UserApi,
    to: string,
    amount: string,
    walletPassword?: string
  ): Promise<{ success: boolean; message?: string }>;
}
