import { Context } from '../types/context';
import { mnemonic as mnemonicUtils, crypto } from '../utils'
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';
import { config, logger } from '../common';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  private async saveWalletPassword(userId: string, walletPassword: string, mnemonic: string) {
    logger.debug(`resolvers.wallet.saveWalletPassword.userId: ${userId}`)
    logger.debug(`resolvers.wallet.saveWalletPassword.!!mnemonic: ${!!mnemonic}`)
    logger.debug(`resolvers.wallet.saveWalletPassword.!!walletPassword: ${!!walletPassword}`)
    const lowerMnemonic = mnemonic.toLowerCase()
    const encryptedPass = this.encrypt(walletPassword, lowerMnemonic)
    const hashedMnemonic = this.hash(lowerMnemonic)
    const result = await credentialService.create(userId, 'x', hashedMnemonic, encryptedPass);
    logger.debug(`resolvers.wallet.saveWalletPassword.result.status: ${result.status}`)
    return result;
  }

  private async getAndDecryptWalletPassword(userId: string, mnemonic: string) {
    logger.debug(`resolvers.wallet.getAndDecryptWalletPassword.userId: ${userId}`)
    logger.debug(`resolvers.wallet.getAndDecryptWalletPassword.!!mnemonic: ${!!mnemonic}`)
    const lowerMnemonic = mnemonic.toLowerCase()
    const hashedMnemonic = this.hash(lowerMnemonic)
    const encryptedPassword = await credentialService.get(userId, 'x', hashedMnemonic);
    logger.debug(`resolvers.wallet.getAndDecryptWalletPassword.encryptedPassword.status: ${encryptedPassword.status}`)
    const password = this.decrypt(encryptedPassword, lowerMnemonic);
    logger.debug(`resolvers.wallet.getAndDecryptWalletPassword.!!password: ${!!password}`)
    return password
  }

  private requireValidMnemonic(mnemonic: string) {
    logger.debug(`resolvers.wallet.requireValidMnemonic.!!mnemonic: ${!!mnemonic}`)
    const isValidMnemonic = mnemonicUtils.validate(mnemonic.toLowerCase());
    logger.debug(`resolvers.wallet.requireValidMnemonic.isValidMnemonic: ${isValidMnemonic}`)
    if (!isValidMnemonic) throw Error('Invalid recovery phrase')
  }

  private selectUserIdOrAddress(
    userId: string,
    parent: { symbol: string, receiveAddress: string }
  ) {
    logger.debug(`resolvers.wallet.selectUserIdOrAddress.parent.symbol: ${parent.symbol}`)
    logger.debug(`resolvers.wallet.selectUserIdOrAddress.parent.receiveAddress: ${parent.receiveAddress}`)
    if (parent.symbol.toLowerCase() === 'btc') return userId;
    return parent.receiveAddress;
  }

  async createWallet(
    parent: any,
    args: { mnemonic: string, walletPassword: string },
    { user, wallet }: Context,
  ) {
    const { mnemonic: recoveryPhrase, walletPassword } = args;
    logger.debug(`resolvers.wallet.createWallet.walletPassword(typeof,length): ${typeof walletPassword},${walletPassword ? walletPassword.length : 'falsy'}`)
    this.requireAuth(user);
    this.maybeRequireStrongWalletPassword(walletPassword)
    try {
      this.maybeRequireStrongWalletPassword(walletPassword)
      const mnemonicIsValid = mnemonicUtils.validate(recoveryPhrase);
      logger.debug(`resolvers.wallet.createWallet.mnemonicIsValid: ${mnemonicIsValid}`)
      if (!mnemonicIsValid) throw new Error('Invalid mnemonic')
      const btcApi = wallet.coin('btc');
      const ethApi = wallet.coin('eth');
      const [btcExists, ethExists] = await Promise.all([
        btcApi.checkIfWalletExists(user),
        ethApi.checkIfWalletExists(user)
      ]);
      logger.debug(`resolvers.wallet.createWallet.btcExists,ethExists: ${btcExists},${ethExists}`)
      if (btcExists || ethExists) throw new Error('Wallet already exists');
      const [btcWalletCreated, ethWalletCreated] = await Promise.all([
        btcApi.createWallet(user, walletPassword, recoveryPhrase),
        ethApi.createWallet(user, walletPassword, recoveryPhrase)
      ]);
      logger.debug(`resolvers.wallet.createWallet.btcWalletCreated,ethWalletCreated: ${btcWalletCreated},${ethWalletCreated}`)
      if (!btcWalletCreated || !ethWalletCreated) throw new Error('Error creating wallet')
      if (config.clientSecretKeyRequired) {
        await this.saveWalletPassword(user.userId, walletPassword, recoveryPhrase)
      }
      return {
        success: true,
        message: 'Wallet created'
      }
    } catch (error) {
      logger.debug(`resolvers.wallet.createWallet.catch: ${error}`)
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
      logger.debug(`resolvers.wallet.getWallet.coinSymbol: ${coinSymbol}`)
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getWalletInfo(user);
      logger.debug(`resolvers.wallet.getWallet.walletResult: ${walletResult}`)
      return [walletResult];
    }
    const { allCoins } = wallet;
    const walletData = await Promise.all(
      allCoins.map(walletCoinApi => walletCoinApi.getWalletInfo(user)),
    );
    logger.debug(`resolvers.wallet.getWallet.walletData.length: ${walletData.length}`)
    return walletData;
  }

  async getBalance(parent: any, args: {}, { user, wallet }: Context) {
    this.requireAuth(user);
    const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent);
    logger.debug(`resolvers.wallet.getBalance.walletData: ${userIdOrAddress}`)
    const walletApi = wallet.coin(parent.symbol);
    logger.debug(`resolvers.wallet.getBalance.parent.symbol: ${parent.symbol}`)
    const walletResult = await walletApi.getBalance(userIdOrAddress);
    logger.debug(`resolvers.wallet.getBalance.walletResult.confirmed: ${walletResult.confirmed}`)
    logger.debug(`resolvers.wallet.getBalance.walletResult.unConfirmed: ${walletResult.unconfirmed}`)
    return walletResult;
  }

  public generateMnemonic(
    parent: any, args: { lang: string }, { user }: Context
  ) {
    try {
      this.requireAuth(user);
      const lang = args.lang || 'en';
      logger.debug(`resolvers.wallet.generateMnemonic.lang: ${lang}`)
      const generatedMnemonic = mnemonicUtils.generateRandom(lang);
      logger.debug(`resolvers.wallet.generateMnemonic.generatedMnemonic.length: ${generatedMnemonic.split(' ').length}`)
      return generatedMnemonic
    } catch (error) {
      logger.warn(`resolvers.wallet.generateMnemonic.catch: ${error}`)
    }
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
      logger.debug(`resolvers.wallet.recoverWallet.!!oldPassword: ${!!oldPassword}`)

      const [btcSuccess, ethSuccess] = await Promise.all([
        btcApi.recoverWallet(user, oldPassword, newPassword),
        ethApi.recoverWallet(user, oldPassword, newPassword)
      ])
      logger.debug(`resolvers.wallet.recoverWallet.btcSuccess: ${btcSuccess}`)
      logger.debug(`resolvers.wallet.recoverWallet.ethSuccess: ${ethSuccess}`)
      if (!btcSuccess || !ethSuccess) throw new Error('Error while recovering wallet');
      await this.saveWalletPassword(user.userId, newPassword, mnemonic);
      logger.debug(`resolvers.wallet.recoverWallet.saveWalletPassword:done`)
      return {
        success: true,
        message: 'Wallet password changed successfully'
      }
    } catch (error) {
      logger.warn(`resolvers.wallet.recoverWallet.catch: ${error}`)
      let message;
      if (error.message && error.message === crypto.ERROR_INCORRECT_SECRET) {
        message = 'Incorrect recovery phrase'
      } else if (error.response && error.response.status && error.response.status === 404) {
        message = 'Incorrect recovery phrase'
      }
      logger.warn(`resolvers.wallet.recoverWallet.catch.message: ${message}`)

      if (!message) {
        throw error;
      }

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
    logger.debug(`resolvers.wallet.getTransactions.userIdOrAddress: ${userIdOrAddress}`)
    const walletApi = wallet.coin(parent.symbol);
    logger.debug(`resolvers.wallet.getTransactions.parent.symbol: ${parent.symbol}`)
    const transactions = await walletApi.getTransactions(userIdOrAddress, parent.blockNumAtCreation);
    logger.debug(`resolvers.wallet.getTransactions.parent.blockNumAtCreation: ${parent.blockNumAtCreation}`)
    return transactions;
  }

  async estimateFee(
    { symbol }: { symbol: string },
    args: any,
    { user, wallet }: Context,
  ) {
    logger.debug(`resolvers.wallet.estimateFee.user.userId: ${user.userId}`)
    this.requireAuth(user);
    logger.debug(`resolvers.wallet.estimateFee.user.userId:ok`)
    const walletApi = wallet.coin(symbol);
    const feeEstimate = await walletApi.estimateFee(user);
    logger.debug(`resolvers.wallet.estimateFee.feeEstimate: ${feeEstimate}`)
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
    logger.debug(`resolvers.wallet.sendTransaction.walletPassword.length>1: ${walletPassword && walletPassword.length && walletPassword.length > 1}`)
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
