import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { logger, config } from '../common';
import { IWalletEnvironment } from '../models/environment';
import { IUserWallet } from '../types';
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
    const adjustedHost = config.hostname.replace('.walletsrv', '');
    logger.debug(
      `resolvers.share.shareUser.config.adjustedHost: ${adjustedHost}`,
    );
    try {
      const {
        walletCompanyFee: companyFee,
        walletReferrerReward: referrerReward,
        walletRewardAmount: rewardAmount,
        walletRewardCurrency: rewardCurrency,
        walletShareLimit: shareLimit,
        walletUserBalanceThreshold: userBalanceThreshold,
      } = (await environment.findOne({
        domain: adjustedHost,
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
        `resolvers.share.shareConfig.shareConfigResponse: ${JSON.stringify(
          shareConfigResponse,
        )}`,
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
        userWallet, // Returned for use in child resolver
      };
      logger.debug(
        `resolvers.share.shareUser.shareUserResponse: ${JSON.stringify(
          shareUserResponse,
        )}`,
      );
      return shareUserResponse;
    } catch (error) {
      logger.warn(`resolvers.share.shareUser.catch: ${error}`);
      throw error;
    }
  }

  public async shareUrl(
    parent: { activated: boolean; userWallet: IUserWallet },
    args: {},
    { dataSources: { bitly }, user }: Context,
  ) {
    try {
      const { activated, userWallet } = parent;
      logger.debug(`resolvers.share.shareUrl.user.userId: ${user.userId}`);
      logger.debug(`resolvers.share.shareUrl.activated: ${activated}`);
      logger.debug(
        `resolvers.share.shareUrl.userWallet.shareLink: ${userWallet &&
          userWallet.shareLink}`,
      );
      if (!activated) return null;
      if (userWallet.shareLink) {
        return userWallet.shareLink;
      }
      const userModel = await user.findFromDb();
      logger.debug(
        `resolvers.share.shareUrl.userModel.affiliateId: ${
          userModel.affiliateId
        }`,
      );
      const url = await bitly.getLink(userModel.affiliateId);
      logger.debug(`resolvers.share.url: ${url}`);
      userModel.set('wallet.shareLink', url);
      await userModel.save();
      logger.debug(`resolvers.share.shareUrl.usermodel.save(): done`);
      return url;
    } catch (error) {
      logger.warn(`resolvers.share.shareUrl.catch: ${error}`);
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
  ShareUser: {
    shareUrl: resolvers.shareUrl,
  },
};
