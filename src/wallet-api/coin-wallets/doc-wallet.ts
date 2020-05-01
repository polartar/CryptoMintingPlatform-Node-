import CoinWalletBase from './coin-wallet-base';
import { logger } from '../../common';
import { PromotionalReward } from '../../models';
import { buildGetUserRewardsPipeline } from '../../pipelines';
import {
  ITransaction,
  ICoinMetadata,
  ISendOutput,
  IPromotionalRewardDoc,
} from '../../types';
import { UserApi } from '../../data-sources';

class DocWallet extends CoinWalletBase {
  rewardNames: string[];

  constructor({
    name,
    symbol,
    contractAddress,
    abi,
    backgroundColor,
    icon,
  }: ICoinMetadata) {
    super(name, symbol, contractAddress, abi, backgroundColor, icon);
    this.setRewardName();
  }

  private setRewardName() {
    switch (this.symbol.toLowerCase()) {
      case 'winx': {
        this.rewardNames = ['WinX'];
        break;
      }
      case 'smart': {
        this.rewardNames = ['Smart'];
        break;
      }
      case 'gala': {
        this.rewardNames = ['Arc', 'GALA'];
        break;
      }
      default: {
        throw new Error('Symbol not supported for DocWallet');
      }
    }
  }

  public async checkIfWalletExists(userApi: UserApi) {
    logger.debug(`walletApi.coin-wallets.DocWallet.checkIfWalletExists: true`);
    return true;
  }

  public async createWallet(
    userApi: UserApi,
    walletPassword: string,
    mnemonic: string,
  ) {
    return true;
  }

  public async estimateFee(userApi: UserApi) {
    const feeData = {
      estimatedFee: '0',
      feeCurrency: this.symbol,
      feeCurrencyBalance: '0',
    };
    return feeData;
  }

  public async getWalletInfo(userApi: UserApi) {
    try {
      logger.debug(
        `walletApi.coin-wallets.DocWallet.getWalletInfo.userId:${userApi.userId}`,
      );
      return {
        receiveAddress: '',
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
        canSendFunds: false,
        lookupTransactionsBy: userApi.userId,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.DocWallet.getWalletInfo.catch:${error}`,
      );
      throw error;
    }
  }

  async getBalance(userId: string) {
    logger.debug(
      `walletApi.coin-wallets.DocWallet.getBalance.userId:${userId}`,
    );
    try {
      const pipeline = buildGetUserRewardsPipeline(userId, this.rewardNames);
      const [rewardResponse] = await PromotionalReward.aggregate(pipeline);
      const balance = rewardResponse ? rewardResponse.balance : '0.0';
      logger.debug(
        `walletApi.coin-wallets.DocWallet.getBalance.balance:${balance}`,
      );
      return {
        unconfirmed: balance,
        confirmed: balance,
      };
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.DocWallet.getBalance.catch:${error}`);
      throw error;
    }
  }

  async getTransactions(
    userId: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      logger.debug(
        `walletApi.coin-wallets.DocWallet.getTransactions.userId:${userId}`,
      );

      const transactions = await PromotionalReward.find({
        userId,
        rewardName: { $in: this.rewardNames },
      });
      logger.debug(
        `walletApi.coin-wallets.DocWallet.getTransactions.transactions.length:${transactions.length}`,
      );
      const formattedTransactions = this.formatTransactions(
        transactions,
        userId,
      );
      return formattedTransactions;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.DocWallet.getTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  async send(userApi: UserApi, outputs: ISendOutput[], walletPassword: string) {
    const [{ amount }] = outputs;
    logger.debug(
      `walletApi.coin-wallets.DocWallet.send.userId:${userApi.userId}`,
    );
    logger.debug(`walletApi.coin-wallets.DocWallet.send.amount:${amount}`);
    return {
      message: 'Cannot send from this wallet',
      success: false,
    };
  }

  private formatTransactions(
    transactions: IPromotionalRewardDoc[],
    userId: string,
  ): ITransaction[] {
    try {
      logger.debug(
        `walletApi.coin-wallets.DocWallet.formatTransactions.transactions.length:${transactions.length}`,
      );
      logger.debug(
        `walletApi.coin-wallets.DocWallet.formatTransactions.userId:${userId}`,
      );
      return transactions.map(rawTx => {
        const { id, amount, created } = rawTx;
        const returnTx = {
          id: id,
          status: 'Complete',
          confirmations: 6,
          timestamp: Math.round(created.getTime() / 1000),
          fee: '0',
          link: '',
          to: [userId],
          from: 'GALA',
          type: 'Deposit',
          amount: amount.toString(),
          total: amount.toString(),
        };
        logger.silly(
          `walletApi.coin-wallets.DocWallet.formatTransactions.returnTx:${JSON.stringify(
            returnTx,
          )}`,
        );
        return returnTx;
      });
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.DocWallet.formatTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  public async recoverWallet(
    userApi: UserApi,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      logger.debug(
        `walletApi.coin-wallets.DocWallet.recoverWallet.userId:${userApi.userId}`,
      );
      return true;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.DocWallet.recoverWallet.catch:${error}`,
      );
      throw error;
    }
  }
}

export default DocWallet;
