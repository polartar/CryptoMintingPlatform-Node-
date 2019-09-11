import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { config, logger } from '../common';
import { IWalletEnvironment } from '../models/environment';
import autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async shareConfig(
    parent: any,
    args: {},
    { dataSources: { environment }, user }: Context,
  ) {
    logger.debug(
      `resolvers.share.shareConfig.user.userId: ${user && user.userId}`,
    );
    this.requireAuth(user);
    try {
      const {
        walletCompanyFee: companyFee,
        walletReferrerReward: referrerReward,
        walletRewardAmount: rewardAmount,
        walletRewardCurrency: rewardCurrency,
        walletShareLimit: shareLimit,
        walletUserBalanceThreshold: userBalanceThreshold,
      } = (await environment.findOne({
        domain: config.hostname,
      })) as IWalletEnvironment;
      const shareConfigResponse = {
        referrerReward,
        companyFee,
        rewardCurrency,
        rewardAmount,
        userBalanceThreshold,
        shareLimit,
      };
      logger.debug(
        `resolvers.share.shareConfig.shareConfigResponse: ${shareConfigResponse}`,
      );
      return shareConfigResponse;
    } catch (error) {
      logger.warn(`resolvers.share.shareConfig.catch: ${error}`);
      throw error;
    }
  }
  public async shareUser(parent: any, args: {}, { user, wallet }: Context) {
    logger.debug(
      `resolvers.share.shareUser.user.userId: ${user && user.userId}`,
    );

    this.requireAuth(user);
    try {
      const { wallet: userWallet } = await user.findFromDb();
      if (!userWallet) throw new Error('User wallet not initialized');
      logger.debug(
        `resolvers.share.shareUser.userWallet.activated: ${
          userWallet.activated
        }`,
      );
      if (!userWallet.activated) {
        return { activated: false };
      }
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      const shareUserResponse = {
        activated: true,
        btcBalanceConfirmed: confirmed,
        btcBalancePending: unconfirmed,
      };
      logger.debug(
        `resolvers.share.shareUser.shareUserResponse: ${shareUserResponse}`,
      );
    } catch (error) {
      logger.warn(`resolvers.share.shareUser.catch: ${error}`);
      throw error;
    }
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    shareConfig: resolvers.shareConfig,
    shareUser: resolvers.shareUser,
  },
};
