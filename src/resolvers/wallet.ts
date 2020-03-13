import { withFilter, ApolloError } from 'apollo-server-express';
import { Context } from '../types/context';
import { mnemonic as mnemonicUtils, crypto } from '../utils';
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';
import { config, logger } from '../common';
import { ISendOutput, IBcoinTx, CoinSymbol } from '../types';
import listeners from '../blockchain-listeners';
import { WalletApi } from '../wallet-api';
import { UserApi } from '../data-sources';
import { gameItemsReward } from '../services/reward-distributer/reward-handlers/game-item-reward';

class Resolvers extends ResolverBase {
  private saveWalletPassword = async (
    userId: string,
    walletPassword: string,
    mnemonic: string,
  ) => {
    const lowerMnemonic = mnemonic.toLowerCase();
    const encryptedPass = this.encrypt(walletPassword, lowerMnemonic);
    const hashedMnemonic = this.hash(lowerMnemonic);
    const result = await credentialService.create(
      userId,
      'x',
      hashedMnemonic,
      encryptedPass,
    );
    return result;
  };

  private getAndDecryptWalletPassword = async (
    userId: string,
    mnemonic: string,
  ) => {
    const lowerMnemonic = mnemonic.toLowerCase();
    const hashedMnemonic = this.hash(lowerMnemonic);
    const encryptedPassword = await credentialService.get(
      userId,
      'x',
      hashedMnemonic,
    );
    const password = this.decrypt(encryptedPassword, lowerMnemonic);
    return password;
  };

  private requireValidMnemonic = (mnemonic: string) => {
    const isValidMnemonic = mnemonicUtils.validate(mnemonic.toLowerCase());
    if (!isValidMnemonic) throw Error('Invalid recovery phrase');
  };

  private selectUserIdOrAddress = (
    userId: string,
    parent: { symbol: string; receiveAddress: string },
  ) => {
    switch (parent.symbol.toLowerCase()) {
      case 'btc': {
        return userId;
      }
      case 'arcade': {
        return userId;
      }
      case 'winx': {
        return userId;
      }
      default: {
        return parent.receiveAddress;
      }
    }
  };

  private sendBetaKey = async (wallet: WalletApi, user: UserApi) => {
    const { brand } = config;
    if (!['localhost', 'arcade'].includes(brand)) return;
    const { receiveAddress: ethAddress } = await wallet
      .coin('ETH')
      .getWalletInfo(user);

    const tokenId =
      '0x8000000000000000000000000000001e00000000000000000000000000000000';
    const qtyOwned = await gameItemsReward.getQuantityOwned(
      user.userId,
      tokenId,
    );
    if (qtyOwned >= 1) return;
    const result = await gameItemsReward.sendItemByTokenId(
      user.userId,
      ethAddress,
      tokenId,
      1,
    );

    return result;
  };

  createWallet = async (
    parent: any,
    args: { mnemonic: string; walletPassword: string },
    { user, wallet, dataSources: { sendEmail } }: Context,
  ) => {
    const keyServiceOk = await credentialService.checkHealth(user.userId);
    if (!keyServiceOk) {
      throw new Error('Key service down');
    }
    const { mnemonic: recoveryPhrase, walletPassword } = args;
    this.requireAuth(user);
    try {
      this.maybeRequireStrongWalletPassword(walletPassword);
      const mnemonicIsValid = mnemonicUtils.validate(recoveryPhrase);
      if (!mnemonicIsValid) throw new Error('Invalid mnemonic');

      const walletsExist = await Promise.all(
        wallet.parentInterfaces.map(parentCoin =>
          parentCoin.checkIfWalletExists(user),
        ),
      );
      if (walletsExist.some(walExists => walExists))
        throw new Error('Wallet already exists');
      const walletsCreated = await Promise.all(
        wallet.parentInterfaces.map(parentCoin =>
          parentCoin.createWallet(user, walletPassword, recoveryPhrase),
        ),
      );

      if (walletsCreated.some(createdWallet => !createdWallet))
        throw new Error('Error creating wallet');
      if (config.clientSecretKeyRequired) {
        await this.saveWalletPassword(
          user.userId,
          walletPassword,
          recoveryPhrase,
        );
      }

      user.findFromDb().then(referredUser => {
        if (referredUser && referredUser.referredBy) {
          user.Model.findOne({ affiliateId: referredUser.referredBy })
            .exec()
            .then(referrer => {
              sendEmail.shareAccepted(referrer, referredUser);
            });
        }
      });

      this.sendBetaKey(wallet, user);

      return {
        success: true,
        message: 'Wallet created',
      };
    } catch (error) {
      logger.debug(`resolvers.wallet.createWallet.catch: ${error}`);
      let message;
      switch (error.message) {
        case 'Error creating wallet': {
          message = error.message;
          break;
        }
        case 'Wallet password required': {
          message = error.message;
          break;
        }
        case 'Weak Password': {
          message = error.message;
          break;
        }
        case 'Wallet already exists': {
          message = error.message;
          break;
        }
        default: {
          throw error;
        }
      }
      return {
        success: false,
        message: message,
      };
    }
  };

  getWallet = async (
    parent: any,
    { coinSymbol }: { coinSymbol?: string },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    try {
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
    } catch (error) {
      logger.warn(`resolvers.wallet.getWallet.catch: ${error}`);
      throw error;
    }
  };

  getBalance = async (parent: any, args: {}, { user, wallet }: Context) => {
    this.requireAuth(user);
    try {
      const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent);
      const walletApi = wallet.coin(parent.symbol);
      const walletResult = await walletApi.getBalance(userIdOrAddress);
      return walletResult;
    } catch (error) {
      logger.debug(`resolvers.wallet.getBalance.catch: ${error}`);
      throw error;
    }
  };

  public generateMnemonic = (
    parent: any,
    args: { lang: string },
    { user }: Context,
  ) => {
    this.requireAuth(user);
    try {
      const lang = args.lang || 'en';
      const generatedMnemonic = mnemonicUtils.generateRandom(lang);
      return generatedMnemonic;
    } catch (error) {
      logger.warn(`resolvers.wallet.generateMnemonic.catch: ${error}`);
      throw error;
    }
  };

  recoverWallet = async (
    parent: any,
    args: { mnemonic: string; newPassword: string },
    { user, wallet }: Context,
  ) => {
    const { mnemonic, newPassword } = args;
    this.requireAuth(user);
    try {
      this.requireValidMnemonic(mnemonic);
      const oldPassword = await this.getAndDecryptWalletPassword(
        user.userId,
        mnemonic,
      );
      const recoverySuccessful = await Promise.all(
        wallet.parentInterfaces.map(coin =>
          coin.recoverWallet(user, oldPassword, newPassword),
        ),
      );
      if (!recoverySuccessful.every(recoveryAttempt => recoveryAttempt))
        throw new Error('Error while recovering wallet');
      await this.saveWalletPassword(user.userId, newPassword, mnemonic);
      return {
        success: true,
        message: 'Wallet password changed successfully',
      };
    } catch (error) {
      logger.warn(`resolvers.wallet.recoverWallet.catch: ${error}`);
      let message;
      if (error.message && error.message === crypto.ERROR_INCORRECT_SECRET) {
        message = 'Incorrect recovery phrase';
      } else if (
        error.response &&
        error.response.status &&
        error.response.status === 404
      ) {
        message = 'Incorrect recovery phrase';
      }
      logger.warn(`resolvers.wallet.recoverWallet.catch.message: ${message}`);

      if (!message) {
        throw error;
      }

      return {
        success: false,
        message: message,
      };
    }
  };

  getTransactions = async (
    parent: {
      symbol: string;
      receiveAddress: string;
      blockNumAtCreation: number;
    },
    args: any,
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    try {
      const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent);
      const walletApi = wallet.coin(parent.symbol);
      const transactions = await walletApi.getTransactions(
        userIdOrAddress,
        parent.blockNumAtCreation,
      );
      return transactions;
    } catch (error) {
      logger.warn(`resolvers.wallet.getTransactions.catch: ${error}`);
      throw error;
    }
  };

  validateMnemonic = async (
    parent: any,
    args: { mnemonic: string },
    { user }: Context,
  ) => {
    this.requireAuth(user);
    let mnemonicValid = false;
    try {
      mnemonicValid = !!(await this.getAndDecryptWalletPassword(
        user.userId,
        args.mnemonic.toLowerCase(),
      ));
    } catch (error) {}
    return {
      valid: mnemonicValid,
    };
  };

  estimateFee = async (
    { symbol }: { symbol: string },
    args: any,
    { user, wallet }: Context,
  ) => {
    try {
      this.requireAuth(user);
      const walletApi = wallet.coin(symbol);
      const feeEstimate = await walletApi.estimateFee(user);
      return feeEstimate;
    } catch (error) {
      logger.warn(`resolvers.wallet.estimateFee.catch: ${error}`);
      throw error;
    }
  };

  sendTransaction = async (
    parent: any,
    {
      coinSymbol,
      outputs,
      totpToken,
      walletPassword,
    }: {
      coinSymbol: string;
      accountId: string;
      outputs: ISendOutput[];
      totpToken: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    try {
      this.requireAuth(user);
      this.maybeRequireStrongWalletPassword(walletPassword);
      // const twoFaValid = await user.validateTwoFa(totpToken);
      // this.requireTwoFa(twoFaValid);
      const walletApi = wallet.coin(coinSymbol);
      const result = await walletApi.send(user, outputs, walletPassword);
      return result;
    } catch (error) {
      logger.warn(`resolvers.wallet.sendTransaction.catch: ${error}`);
      let message;
      switch (error.message) {
        case 'Weak Password': {
          message = 'Incorrect Password';
          break;
        }
        case 'Invalid two factor auth token': {
          message = 'Invalid one-time password';
          break;
        }
        default: {
          throw error;
        }
      }
      return {
        success: false,
        message,
      };
    }
  };

  listenForNewBalance = (
    parent: any,
    { coinSymbol }: { coinSymbol: CoinSymbol },
    { user }: Context,
  ) => {
    this.requireAuth(user);
    if (coinSymbol !== CoinSymbol.btc) {
      throw new ApolloError(
        `${coinSymbol} is not supported by this subscription.`,
      );
    }

    listeners[coinSymbol].listenForNewBalance(user.userId);

    return config.pubsub.asyncIterator([config.newBalance]);
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    wallet: resolvers.getWallet,
    mnemonic: resolvers.generateMnemonic,
    validateMnemonic: resolvers.validateMnemonic,
  },
  Wallet: {
    transactions: resolvers.getTransactions,
    feeEstimate: resolvers.estimateFee,
    balance: resolvers.getBalance,
  },
  Mutation: {
    sendTransaction: resolvers.sendTransaction,
    createWallet: resolvers.createWallet,
    recoverWallet: resolvers.recoverWallet,
  },
  Subscription: {
    newBalance: {
      subscribe: withFilter(
        resolvers.listenForNewBalance,
        (
          newTransaction: IBcoinTx & { walletId: string },
          args: {},
          { user }: { user: { userId: string } },
        ) => {
          return newTransaction.walletId === user.userId;
        },
      ),
      resolve: (payload: { walletId: string }) => {
        return {
          success: true,
          ...payload,
        };
      },
    },
  },
};
