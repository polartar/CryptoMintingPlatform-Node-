// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../../types';
import { UserApi } from '../../data-sources';
const SimpleCrypto = require('simple-crypto-js')
const SHA256 = require('crypto-js/sha256')

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

  abstract checkIfWalletExists(user: UserApi): Promise<boolean>;

  abstract getTransactions(addressOrUserId: string, blockNumberAtCreation?: number): Promise<ITransaction[]>;

  abstract estimateFee(userApi: UserApi): Promise<string>;

  abstract send(
    userApi: UserApi,
    to: string,
    amount: string,
    walletPassword: string
  ): Promise<{ success: boolean; message?: string }>;

  abstract createWallet(user: UserApi, walletPassword: string, recoveryPhrase: string): Promise<boolean>;

  protected encrypt(plainText: string, secret: string) {
    const crypto = new SimpleCrypto(secret);
    return crypto.encrypt(plainText).toString()
  }

  protected decrypt(encryptedText: string, secret: string) {
    const crypto = new SimpleCrypto(secret);
    return crypto.decrypt(encryptedText).toString()
  }

  protected hash(value: string) {
    return SHA256(value);
  }
}
