import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { logger, config } from '../common';
import { IWalletEnvironment } from '../models/environment';
import { IUserWallet } from '../types';
import autoBind = require('auto-bind');
import { userSchema, default as User, IUser } from '../models/user';
import { offersSchema, clicksSchema, Click, Offer } from '../models';

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  private async saveClick(referrerId: string, referrerFromBrand: string) {
    const walletName = config.brand.replace('codex', 'connect');
    const offerQuery = { name: `${walletName}_smart_wallet` };
    let OfferModel;
    let ClickModel;
    if (referrerFromBrand === 'self') {
      OfferModel = Offer;
      ClickModel = Click;
    } else if (referrerFromBrand === 'connect') {
      OfferModel = config.connectMongoConnection.model('offer', offersSchema);
      ClickModel = config.connectMongoConnection.model('click', clicksSchema);
    }
    const offer = await OfferModel.findOne(offerQuery);
    ClickModel.create({
      userId: referrerId,
      offerId: offer.id,
      type: 'click',
    });
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

  public async logClick(
    parent: any,
    args: { referredBy: String },
    context: Context,
  ) {
    try {
      const byAffiliateId = { affiliateId: args.referredBy };
      let referrer = await User.findOne(byAffiliateId);
      let referrerFromBrand: string;
      if (referrer) {
        referrerFromBrand = 'self';
      } else {
        if (config.connectMongoConnection) {
          const connectUserModel = config.connectMongoConnection.model<IUser>(
            'user',
            userSchema,
          );
          referrer = await connectUserModel.findOne(byAffiliateId);
          if (referrer) {
            referrerFromBrand = 'connect';
          } else {
            throw new Error('Refferrer not found');
          }
        } else {
          throw new Error('Refferrer not found');
        }
      }
      this.saveClick(referrer.id, referrerFromBrand);
      return {
        firstName: referrer.firstName,
        lastName: referrer.lastName,
      };
    } catch (error) {
      logger.warn(`resolvers.share.logClick.catch:${error}`);
      logger.warn(
        `resolvers.share.logClick.catch.referredBy:${args.referredBy}`,
      );
      throw error;
    }
  }
}

const resolvers = new Resolvers();

export default {
  Mutation: {
    logClick: resolvers.logClick,
  },
  Query: {
    shareConfig: resolvers.shareConfig,
    shareUser: resolvers.shareUser,
  },
  ShareUser: {
    shareUrl: resolvers.shareUrl,
  },
};
