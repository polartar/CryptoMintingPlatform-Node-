import { Context } from '../types/context';
import { mnemonic as mnemonicUtils, crypto } from '../utils'
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';
import { config } from '../common';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  private saveWalletPassword(userId: string, walletPassword: string, mnemonic: string) {
    const lowerMnemonic = mnemonic.toLowerCase()
    const encryptedPass = this.encrypt(walletPassword, lowerMnemonic)
    const hashedMnemonic = this.hash(lowerMnemonic)
    return credentialService.create(userId, 'x', hashedMnemonic, encryptedPass);
  }

  private async getAndDecryptWalletPassword(userId: string, mnemonic: string) {
    const lowerMnemonic = mnemonic.toLowerCase()
    const hashedMnemonic = this.hash(lowerMnemonic)
    const encryptedPassword = await credentialService.get(userId, 'x', hashedMnemonic);
    const password = this.decrypt(encryptedPassword, lowerMnemonic);
    return password
  }

  private requireValidMnemonic(mnemonic: string) {
    const isValidMnemonic = mnemonicUtils.validate(mnemonic.toLowerCase());
    if (!isValidMnemonic) throw Error('Invalid recovery phrase')
  }

  private selectUserIdOrAddress(
    userId: string,
    parent: { symbol: string, receiveAddress: string }) {
    if (parent.symbol.toLowerCase() === 'btc') return userId;
    return parent.receiveAddress;
  }

  async createWallet(
    parent: any,
    args: { mnemonic: string, walletPassword: string },
    { user, wallet }: Context,
  ) {
    const { mnemonic: recoveryPhrase, walletPassword } = args;
    this.requireAuth(user);
    this.maybeRequireStrongWalletPassword(walletPassword)
    try {
      this.maybeRequireStrongWalletPassword(walletPassword)
      const mnemonicIsValid = mnemonicUtils.validate(recoveryPhrase);
      if (!mnemonicIsValid) throw new Error('Invalid mnemonic')
      const btcApi = wallet.coin('btc');
      const ethApi = wallet.coin('eth');
      const [btcExists, ethExists] = await Promise.all([
        btcApi.checkIfWalletExists(user),
        ethApi.checkIfWalletExists(user)
      ]);
      if (btcExists || ethExists) throw new Error('Wallet already exists');
      const [btcWalletCreated, ethWalletCreated] = await Promise.all([
        btcApi.createWallet(user, walletPassword, recoveryPhrase),
        ethApi.createWallet(user, walletPassword, recoveryPhrase)
      ])
      if (!btcWalletCreated || !ethWalletCreated) throw new Error('Error creating wallet')
      if (config.clientSecretKeyRequired) {
        await this.saveWalletPassword(user.userId, walletPassword, recoveryPhrase)
      }
      return {
        success: true,
        message: 'Wallet created'
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || error.stack
      }
    }
  }

  async getWallet(
    parent: any,
    { coinSymbol }: { coinSymbol?: string },
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getWalletInfo(user);
      return [walletResult];
    }
    const { allCoins } = wallet;
    const walletData = await Promise.all(
      allCoins.map(walletCoinApi => walletCoinApi.getWalletInfo(user)),
    );
    return walletData;
  }

  async getBalance(parent: any, args: {}, { user, wallet }: Context) {
    this.requireAuth(user);
    const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent)
    const walletApi = wallet.coin(parent.symbol);
    const walletResult = await walletApi.getBalance(userIdOrAddress);
    return walletResult;
  }

  public generateMnemonic(
    parent: any, args: { lang: string }, { user }: Context
  ) {
    this.requireAuth(user);
    const lang = args.lang || 'en';
    return mnemonicUtils.generateRandom(lang);
  }

  async recoverWallet(
    parent: any, args: { mnemonic: string, newPassword: string }, { user, wallet }: Context
  ) {
    const { mnemonic, newPassword } = args
    this.requireAuth(user);
    try {
      this.requireValidMnemonic(mnemonic);
      const btcApi = wallet.coin('btc');
      const ethApi = wallet.coin('eth');
      const oldPassword = await this.getAndDecryptWalletPassword(user.userId, mnemonic)
      const [btcSuccess, ethSuccess] = await Promise.all([
        btcApi.recoverWallet(user, oldPassword, newPassword),
        ethApi.recoverWallet(user, oldPassword, newPassword)
      ])
      if (!btcSuccess || !ethSuccess) throw new Error('Error while recovering wallet');
      await this.saveWalletPassword(user.userId, newPassword, mnemonic);
      return {
        success: true,
        message: 'Wallet password changed successfully'
      }
    } catch (error) {
      let message;
      if (error.message && error.message === crypto.ERROR_INCORRECT_SECRET) {
        message = 'Incorrect recovery phrase'
      } else if (error.response && error.response.status && error.response.status === 404) {
        message = 'Incorrect recovery phrase'
      }

      if (!message) throw error;

      return {
        success: false,
        message: message
      }
    }
  }

  async getTransactions(
    parent: { symbol: string, receiveAddress: string, blockNumAtCreation: number },
    args: any,
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent)
    const walletApi = wallet.coin(parent.symbol);
    const transactions = await walletApi.getTransactions(userIdOrAddress, parent.blockNumAtCreation);
    return transactions;
  }

  async estimateFee(
    { symbol }: { symbol: string },
    args: any,
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const feeEstimate = await walletApi.estimateFee(user);
    return feeEstimate;
  }

  async sendTransaction(
    parent: any,
    {
      coinSymbol,
      to,
      amount,
      totpToken,
      walletPassword
    }: {
      coinSymbol: string;
      accountId: string;
      to: string;
      amount: string;
      totpToken: string;
      walletPassword: string
    },
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    this.maybeRequireStrongWalletPassword(walletPassword)
    // const twoFaValid = await user.validateTwoFa(totpToken);
    // this.requireTwoFa(twoFaValid);
    const walletApi = wallet.coin(coinSymbol);
    const result = await walletApi.send(user, to, amount, walletPassword);
    return result;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    wallet: resolvers.getWallet,
    mnemonic: resolvers.generateMnemonic
  },
  Wallet: {
    transactions: resolvers.getTransactions,
    feeEstimate: resolvers.estimateFee,
    balance: resolvers.getBalance,
  },
  Mutation: {
    sendTransaction: resolvers.sendTransaction,
    createWallet: resolvers.createWallet,
    recoverWallet: resolvers.recoverWallet
  },
};
