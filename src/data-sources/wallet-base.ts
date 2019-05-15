// import { validateMnemonic, validatePin, encryptPrivateKey } from './crypto';

export default abstract class WalletBase {
  constructor(
    protected name: string,
    protected symbol: string,
    protected contract: string,
  ) {}

  // web3
  // abstract getTransactions

  abstract getBalance(
    userId: string,
  ): Promise<{
    symbol: string;
    name: string;
    balance: { confirmed: number; unconfirmed: number };
  }>;

  // abstract sendToken

  // abstract getPrivateKey
}
