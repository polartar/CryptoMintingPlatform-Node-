import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { logger, config } from '../common';
import {
  default as WalletConfig,
  IWalletConfig,
} from '../models/wallet-config';
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

  private async getRewardConfig(reward: string) {
    const shareConfigResult = await WalletConfig.find({ brand: config.brand });
    const [rewardConfigResult] = shareConfigResult.filter(rewardConfig => {
      return (
        rewardConfig.rewardCurrency.toLocaleLowerCase() === reward.toLowerCase()
      );
    });
    return rewardConfigResult;
  }

  private async getShareConfigs(alreadyActivatedRewards: string[] = []) {
    try {
      const available = await WalletConfig.find({ brand: config.brand });

      if (!available.length) throw new Error(`Share config not found.`);
      logger.debug(
        `resolvers.share.getShareConfig.shareConfig: ${JSON.stringify(
          available,
        )}`,
      );
      const unactivated = available.filter(
        result =>
          !alreadyActivatedRewards.includes(
            result.rewardCurrency.toLowerCase(),
          ),
      );
      return {
        available,
        unactivated,
      };
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

  public async shareConfig(parent: any, args: {}, { user, wallet }: Context) {
    this.requireAuth(user);
    try {
      const { brand } = config;
      const { wallet: userWallet } = await user.findFromDb();
      const { arcade, green, winx } = userWallet.activations;
      let numberOfActivations = 0;
      const alreadyActivated = Object.entries({ arcade, green, winx })
        .filter(([name, activationData]) => {
          if (activationData && activationData.activated) {
            numberOfActivations++;
            return true;
          } else {
            return false;
          }
        })
        .map(([name]) => name);
      const { available, unactivated } = await this.getShareConfigs(
        alreadyActivated,
      );
      logger.debug(
        `resolvers.share.shareConfig.available: ${JSON.stringify(available)}`,
      );
      logger.debug(
        `resolvers.share.shareConfig.unactivated: ${JSON.stringify(
          unactivated,
        )}`,
      );
      if (!userWallet) throw new Error('User wallet not initialized');
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      logger.debug(
        `resolvers.share.shareConfig.confirmed,unconfirmed: ${JSON.stringify({
          confirmed,
          unconfirmed,
        })}`,
      );
      const activatedShares =
        (userWallet && userWallet.shares && userWallet.shares[brand]) || 0;
      logger.debug(
        `resolvers.share.shareConfig.activatedShares: ${activatedShares}`,
      );
      const shareConfig = {
        numberOfActivations,
        btcBalanceConfirmed: confirmed,
        btcBalancePending: unconfirmed,
        userWallet, // Returned for use in child resolver
        activatedShares,
        shareOptions: available,
        unactivatedShareOptions: unactivated,
      };
      logger.debug(
        `resolvers.share.shareConfig.shareConfig: ${JSON.stringify(
          shareConfig,
        )}`,
      );
      return shareConfig;
    } catch (error) {}
  }

  public async shareUrl(
    parent: {
      activated: boolean;
      userWallet: IUserWallet;
      numberOfActivations: string;
    },
    args: {},
    { dataSources: { bitly }, user }: Context,
  ) {
    try {
      const { activated, userWallet, numberOfActivations } = parent;
      logger.debug(`resolvers.share.shareUrl.user.userId: ${user.userId}`);
      logger.debug(`resolvers.share.shareUrl.activated: ${activated}`);
      logger.debug(
        `resolvers.share.shareUrl.userWallet.shareLink: ${userWallet &&
          userWallet.shareLink}`,
      );
      if (!numberOfActivations) return null;
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

  private async getOutputs(
    referrer: IUser,
    shareConfig: IWalletConfig,
    btcPrice: number,
  ) {
    const { companyFeeBtcAddress, partnerFeeBtcAddress, brand } = config;
    const {
      companyFee,
      referrerReward,
      shareLimit, // How is share limit handled with multiple activations?
    } = shareConfig;
    logger.debug(`resolvers.share.shareActivate.companyFee: ${companyFee}`);
    logger.debug(
      `resolvers.share.shareActivate.referrerReward: ${referrerReward}`,
    );
    const referrerAboveShareLimit =
      referrer &&
      referrer.wallet &&
      referrer.wallet.shares &&
      referrer.wallet.shares[brand] >= shareLimit;
    const companyPortion = this.usdToBtc(btcPrice, companyFee / 2);
    logger.debug(
      `resolvers.share.shareActivate.companyPortion: ${companyPortion}`,
    );
    const partnerPortion = this.usdToBtc(btcPrice, companyFee / 2);
    logger.debug(
      `resolvers.share.shareActivate.partnerPortion: ${partnerPortion}`,
    );
    const referrerPortion = this.usdToBtc(btcPrice, referrerReward);
    logger.debug(
      `resolvers.share.shareActivate.referrerPortion: ${referrerPortion}`,
    );
    let outputs: ISendOutput[];
    if (
      !referrer ||
      referrerAboveShareLimit ||
      !referrer.wallet ||
      !referrer.wallet.btcAddress
    ) {
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
    try {
      if (referrer && (!referrer.wallet || !referrer.wallet.btcAddress)) {
        UnclaimedReward.create({
          userId: referrer.id,
          btcValue: referrerPortion.toFixed(8),
          hasWalletProperty: !!referrer.wallet,
        });
      }
    } catch (error) {
      console.log(error);
    }
    return outputs;
  }

  public async shareActivate(
    parent: any,
    args: {
      walletPassword: string;
      rewardType: string;
    },
    { wallet, user, dataSources: { cryptoFavorites } }: Context,
  ) {
    // in all environments except arcade, company fee address and partner fee address are the same in the .env
    const { brand } = config;
    const rewardType = args.rewardType.toLowerCase();
    this.requireAuth(user);
    try {
      const [[{ price }], dbUser, rewardConfig] = await Promise.all([
        cryptoFavorites.getUserFavorites(['BTC']),
        user.findFromDb(),
        this.getRewardConfig(args.rewardType),
      ]);

      if (!rewardConfig) {
        throw new Error(`Reward currency: ${rewardType} not supported`);
      }

      if (
        !dbUser ||
        !dbUser.wallet ||
        (dbUser.wallet.activations &&
          dbUser.wallet.activations[rewardType] &&
          dbUser.wallet.activations[rewardType].activated)
      ) {
        throw new Error(`User inelligible for activation`);
      }
      logger.debug(`resolvers.share.shareActivate.price: ${price}`);
      const { referrer } = await this.findReferrer(dbUser.referredBy).catch(
        () => ({ referrer: null }),
      );
      const outputs = await this.getOutputs(referrer, rewardConfig, price);

      const { message, transaction, success } = await wallet
        .coin('btc')
        .send(user, outputs, args.walletPassword);

      logger.debug(`resolvers.share.shareActivate.success: ${success}`);
      logger.debug(`resolvers.share.shareActivate.message: ${message}`);
      if (!success) {
        if (message) {
          return {
            success: false,
            message,
          };
        } else {
          throw new Error(message || 'Activation transaction failed');
        }
      }
      logger.debug(
        `resolvers.share.shareActivate.transaction.transaction.id: ${transaction &&
          transaction.id}`,
      );
      dbUser.set(`wallet.activations.${rewardType}.activated`, true);
      dbUser.set(
        `wallet.activations.${rewardType}.activationTxHash`,
        transaction.id,
      );
      dbUser.save();
      const userEthAddress =
        (dbUser && dbUser.wallet && dbUser.wallet.ethAddress) || '';
      rewardDistributer.sendReward(rewardConfig, user.userId, userEthAddress);
      if (referrer && outputs.length === 2) {
        const existingShares =
          (referrer.wallet &&
            referrer.wallet.shares &&
            referrer.wallet.shares[brand]) ||
          0;
        referrer.set(`wallet.shares.${brand}`, existingShares + 1);
        referrer.save();
      }
      return {
        success: true,
        transaction,
      };
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
  },
  ShareConfig: {
    shareUrl: resolvers.shareUrl,
  },
};
