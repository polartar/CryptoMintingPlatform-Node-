import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { logger, config } from '../common';
import { default as environment } from '../models/environment';
import { IUserWallet, ISendOutput } from '../types';
import autoBind = require('auto-bind');
import { userSchema, default as User, IUser } from '../models/user';
import { rewardDistributer } from '../services';
import {
  offersSchema,
  clicksSchema,
  Click,
  Offer,
  UnclaimedReward,
} from '../models';

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  private getAdjustedHost() {
    logger.debug(
      `resolvers.share.getAdjustedHost.config.hostname: ${config.hostname}`,
    );
    const adjustedHost = config.hostname
      .replace('.walletsrv', '')
      .replace('arcadeblockchain.com', 'blockchaingamepartners.io');
    logger.debug(`resolvers.share.getAdjustedHost: ${adjustedHost}`);
    return adjustedHost;
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

  private async getShareConfig() {
    const adjustedHost = this.getAdjustedHost();
    logger.debug(
      `resolvers.share.getShareConfig.adjustedHost: ${adjustedHost}`,
    );
    const {
      walletCompanyFee: companyFee,
      walletReferrerReward: referrerReward,
      walletRewardAmount: rewardAmount,
      walletRewardCurrency: rewardCurrency,
      walletShareLimit: shareLimit,
      walletUserBalanceThreshold: userBalanceThreshold,
    } = await environment.findOne({
      domain: adjustedHost,
    });
    const shareConfig = {
      referrerReward,
      companyFee,
      rewardCurrency,
      rewardAmount,
      userBalanceThreshold,
      shareLimit,
    };
    return shareConfig;
  }

  private async findReferrer(referredBy: string) {
    const byAffiliateId = { affiliateId: referredBy };
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
          throw new Error('referrer not found');
        }
      } else {
        throw new Error('referrer not found');
      }
    }
    return { referrer, brand: referrerFromBrand };
  }

  public async shareConfig(parent: any, args: {}, { user }: Context) {
    logger.debug(
      `resolvers.share.shareConfig.user.userId: ${user && user.userId}`,
    );
    try {
      const shareConfigResponse = await this.getShareConfig();
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
      const { brand } = config;
      const { wallet: userWallet } = await user.findFromDb();
      if (!userWallet) throw new Error('User wallet not initialized');
      logger.debug(
        `resolvers.share.shareUser.userWallet.activated: ${
          userWallet.activated
        }`,
      );
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      const activatedShares =
        (userWallet && userWallet.shares && userWallet.shares[brand]) || 0;
      const shareUserResponse = {
        activated: userWallet.activated,
        btcBalanceConfirmed: confirmed,
        btcBalancePending: unconfirmed,
        userWallet, // Returned for use in child resolver
        activatedShares,
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
    args: { referredBy: string },
    context: Context,
  ) {
    try {
      const { referrer, brand } = await this.findReferrer(args.referredBy);
      this.saveClick(referrer.id, brand);
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

  private btcToCents(btcUsdPrice: number, amount: number) {
    const btcPriceInCents = Math.round(btcUsdPrice * 100);

    return Math.round(amount) / btcPriceInCents;
  }

  public async shareActivate(
    parent: any,
    args: { walletPassword: string },
    { wallet, user, dataSources: { cryptoFavorites } }: Context,
  ) {
    const { companyFeeBtcAddress, brand } = config;
    this.requireAuth(user);
    try {
      const [
        [{ price }],
        dbUser,
        walletShareConfig,
        { confirmed: dbUserBalance },
        { estimatedFee },
      ] = await Promise.all([
        cryptoFavorites.getUserFavorites(['BTC']),
        user.findFromDb(),
        this.getShareConfig(),
        wallet.coin('btc').getBalance(user.userId),
        wallet.coin('btc').estimateFee(user),
      ]);
      const { companyFee, referrerReward, shareLimit } = walletShareConfig;
      if (!dbUser || !dbUser.wallet || dbUser.wallet.activated) {
        throw new Error(`User inelligible for activation`);
      }
      logger.debug(`resolvers.share.shareActivate.price: ${price}`);
      logger.debug(`resolvers.share.shareActivate.companyFee: ${companyFee}`);
      logger.debug(
        `resolvers.share.shareActivate.referrerReward: ${referrerReward}`,
      );
      const btcPriceInCents = Math.round(price * 100);
      const { referrer } = await this.findReferrer(dbUser.referredBy).catch(
        () => ({ referrer: null }),
      );
      const btcFeeInCents = Math.round();
      const dbUserBalanceInCents =
        Math.round(+dbUserBalance * 100) / btcPriceInCents;
      const referrerAboveShareLimit =
        referrer &&
        referrer.wallet &&
        referrer.wallet.shares &&
        referrer.wallet.shares[brand] >= shareLimit;
      const maxCompanyPortion = Math.round(companyFee * 100) / btcPriceInCents;
      const referrerPortion =
        Math.round(referrerReward * 100) / btcPriceInCents;
      let outputs: ISendOutput[];
      if (!referrer || referrerAboveShareLimit) {
        outputs = [
          {
            to: companyFeeBtcAddress,
            amount: (companyPortion + referrerPortion).toFixed(8),
          },
        ];
      } else if (!referrer.wallet || !referrer.wallet.btcAddress) {
        outputs = [
          {
            to: companyFeeBtcAddress,
            amount: (companyPortion + referrerPortion).toFixed(8),
          },
        ];
        await UnclaimedReward.create({
          userId: referrer.id,
          btcValue: referrerPortion.toFixed(8),
          hasWalletProperty: !!referrer.wallet,
        });
      } else {
        outputs = [
          {
            to: config.companyFeeBtcAddress,
            amount: companyPortion.toFixed(8),
          },
          {
            to: referrer.wallet.btcAddress,
            amount: referrerPortion.toFixed(8),
          },
        ];
      }
      logger.debug(
        `resolvers.share.shareActivate.companyPortion: ${companyPortion}`,
      );
      logger.debug(
        `resolvers.share.shareActivate.referrerPortion: ${referrerPortion}`,
      );
      const transaction = await wallet
        .coin('btc')
        .send(user, outputs, args.walletPassword);
      logger.debug(
        `resolvers.share.shareActivate.transaction.transaction.id: ${
          transaction.transaction.id
        }`,
      );
      dbUser.wallet.activated = true;
      dbUser.wallet.activationTxHash = transaction.transaction.id;
      dbUser.save();
      rewardDistributer.sendReward(walletShareConfig, user.userId);
      if (referrer && outputs.length === 2) {
        const existingShares =
          (referrer.wallet &&
            referrer.wallet.shares &&
            referrer.wallet.shares[brand]) ||
          0;
        referrer.set(`wallet.shares.${brand}`, existingShares + 1);
        referrer.save();
      }
      return transaction;
    } catch (error) {
      logger.warn(`resolvers.share.shareActivate.catch: ${error}`);
      throw error;
    }
  }
}

const resolvers = new Resolvers();

export default {
  Mutation: {
    logClick: resolvers.logClick,
    shareActivate: resolvers.shareActivate,
  },
  Query: {
    shareConfig: resolvers.shareConfig,
    shareUser: resolvers.shareUser,
  },
  ShareUser: {
    shareUrl: resolvers.shareUrl,
  },
};
