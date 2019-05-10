// import { validateMnemonic, validatePin, encryptPrivateKey } from './crypto';

export abstract class WalletBase {
  constructor(
    protected name: string,
    protected symbol: string,
    protected contract: string,
  ) {}

  // web3
  // abstract getTransactions

  // abstract getBalance

  // abstract sendToken

  // abstract getPrivateKey
}
