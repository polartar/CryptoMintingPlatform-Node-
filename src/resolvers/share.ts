import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { logger, config } from '../common';
import { default as WalletConfig } from '../models/wallet-config';
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
    try {
      const shareConfigResult = await WalletConfig.findOne({
        brand: config.brand,
      });
      if (!shareConfigResult) throw new Error(`Share config not found.`);
      logger.debug(
        `resolvers.share.getShareConfig.shareConfig: ${JSON.stringify(
          shareConfigResult,
        )}`,
      );
      return shareConfigResult;
    } catch (error) {
      logger.warn(`resolvers.share.getShareConfig.shareConfig: ${error}`);
      throw error;
    }
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

  private usdToBtc(btcUsdPrice: number, amount: number) {
    const btcPriceInCents = Math.round(btcUsdPrice * 100);
    return Math.round(amount * 100) / btcPriceInCents;
  }

  public async shareActivate(
    parent: any,
    args: { walletPassword: string },
    { wallet, user, dataSources: { cryptoFavorites } }: Context,
  ) {
    // in all environments except arcade, company fee address and partner fee address are the same in the .env
    const { companyFeeBtcAddress, partnerFeeBtcAddress, brand } = config;
    this.requireAuth(user);
    try {
      const [[{ price }], dbUser, walletShareConfig] = await Promise.all([
        cryptoFavorites.getUserFavorites(['BTC']),
        user.findFromDb(),
        this.getShareConfig(),
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
      const { referrer } = await this.findReferrer(dbUser.referredBy).catch(
        () => ({ referrer: null }),
      );
      const referrerAboveShareLimit =
        referrer &&
        referrer.wallet &&
        referrer.wallet.shares &&
        referrer.wallet.shares[brand] >= shareLimit;
      const companyPortion = this.usdToBtc(price, companyFee / 2);
      const partnerPortion = this.usdToBtc(price, companyFee / 2);
      const referrerPortion = this.usdToBtc(price, referrerReward);
      let outputs: ISendOutput[];
      if (!referrer || referrerAboveShareLimit) {
        outputs = [
          {
            to: companyFeeBtcAddress,
            amount: (companyPortion + referrerPortion / 2).toFixed(8),
          },
          {
            to: partnerFeeBtcAddress,
            amount: (partnerPortion + referrerPortion / 2).toFixed(8),
          },
        ];
      } else if (!referrer.wallet || !referrer.wallet.btcAddress) {
        outputs = [
          {
            to: companyFeeBtcAddress,
            amount: (companyPortion + referrerPortion / 2).toFixed(8),
          },
          {
            to: partnerFeeBtcAddress,
            amount: (partnerPortion + referrerPortion / 2).toFixed(8),
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
            to: config.partnerFeeBtcAddress,
            amount: referrerPortion.toFixed(8),
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
        `resolvers.share.shareActivate.partnerPortion: ${partnerPortion}`,
      );
      logger.debug(
        `resolvers.share.shareActivate.referrerPortion: ${referrerPortion}`,
      );
      const transaction = await wallet
        .coin('btc')
        .send(user, outputs, args.walletPassword);
      logger.debug(
        `resolvers.share.shareActivate.transaction.transaction.id: ${transaction &&
          transaction.transaction &&
          transaction.transaction.id}`,
      );
      dbUser.wallet.activated = true;
      dbUser.wallet.activationTxHash = transaction.transaction.id;
      dbUser.save();
      const userEthAddress =
        (dbUser && dbUser.wallet && dbUser.wallet.ethAddress) || '';
      rewardDistributer.sendReward(
        walletShareConfig,
        user.userId,
        userEthAddress,
      );
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
