import ResolverBase from '../common/Resolver-Base';
import { config } from '../common';
import { IUserWallet, Context, IWalletConfig } from '../types';
import { userSchema, default as User, IUser } from '../models/user';
import {
  offersSchema,
  clicksSchema,
  Click,
  Offer,
  WalletConfig,
} from '../models';
import { logResolver } from '../common/logger';

export class ShareResolver extends ResolverBase {
  protected saveClick = async (
    referrerId: string,
    referrerFromBrand: string,
  ) => {
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
  };

  protected getShareConfigs = async (user: IUser) => {
    try {
      const { softNodeLicenses } = user.toJSON() as IUser;
      console.log('getShareConfigs::1:softNodeLicenses', softNodeLicenses);
      const {
        alreadyActivated,
        numberOfActivations,
      } = this.getAlreadyActivated(user.wallet);
      console.log('getShareConfigs::2:alreadyActivated', alreadyActivated);

      console.log(
        'getShareConfigs::3:numberOfActivations',
        numberOfActivations,
      );
      const available = await WalletConfig.find({ brand: config.brand });
      console.log('getShareConfigs::4:available', available);
      if (!available.length) throw new Error(`Share config not found.`);
      console.log(
        'getShareConfigs::5:available.length',
        available && available.length,
      );

      const { unactivated, activated } = available.reduce(
        (accum, current) => {
          if (alreadyActivated.includes(current.rewardCurrency.toLowerCase())) {
            accum.activated.push(current);
          } else {
            accum.unactivated.push(current);
          }
          return accum;
        },
        { activated: [], unactivated: [] } as {
          activated: IWalletConfig[];
          unactivated: IWalletConfig[];
        },
      );
      console.log('getShareConfigs::6:unactivated', unactivated);
      console.log('getShareConfigs::7:activated', activated);

      const sharesFromActivation = activated.reduce(
        (total, curr) => total + curr.shareLimits.upgradedAccount,
        0,
      );
      console.log('getShareConfigs::8:sharesFromActivations', activated);

      const sharesPerSoftnodeType = new Map<string, number>();
      available.forEach(({ shareLimits }) => {
        const { softnodeLicense } = shareLimits;

        sharesPerSoftnodeType.set(
          softnodeLicense.softnodeType,
          softnodeLicense.sharesPerLicense,
        );
      });

      const softNodeShares = Object.entries(softNodeLicenses || {}).reduce(
        (acc: number, [softnodeType, numberOfLicenses]) => {
          if (softnodeType === '_id') return acc;
          const sharesPerLicense = sharesPerSoftnodeType.get(softnodeType) || 0;

          return acc + sharesPerLicense * numberOfLicenses;
        },
        0,
      );
      console.log('getShareConfigs::9:softNodeShares', softNodeShares);

      return {
        available,
        unactivated,
        earnedShares:
          config.baseNumberOfShares + sharesFromActivation + softNodeShares,
        numberOfActivations,
      };
    } catch (error) {
      throw error;
    }
  };

  protected findReferrer = async (referredBy: string) => {
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
  };

  protected getAlreadyActivated = (userWallet: IUserWallet) => {
    if (!userWallet || !userWallet.activations) {
      return {
        alreadyActivated: [],
        numberOfActivations: 0,
      };
    }
    const { gala, green, winx } = userWallet.activations;
    let numberOfActivations = 0;
    const alreadyActivated = Object.entries({ gala, green, winx })
      .filter(([name, activationData]) => {
        if (activationData && activationData.activated) {
          numberOfActivations++;
          return true;
        } else {
          return false;
        }
      })
      .map(([name]) => name);
    return {
      alreadyActivated,
      numberOfActivations,
    };
  };

  public shareConfig = async (
    parent: any,
    args: {},
    { user, wallet, logger }: Context,
  ) => {
    this.requireAuth(user);
    // this.requireBrand().toNotBeIn(['arcade', 'gala']);
    try {
      const { brand } = config;
      const dbUser = await user.findFromDb();

      const {
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      } = await this.getShareConfigs(dbUser);
      logger.JSON.debug({
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      });
      const userWallet = dbUser && dbUser.wallet;
      if (!userWallet) throw new Error('User wallet not initialized');
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      logger.JSON.debug({ confirmed, unconfirmed });
      const activatedShares =
        (userWallet && userWallet.shares && userWallet.shares[brand]) || 0;
      logger.obj.debug({ activatedShares });
      const shareConfig = {
        numberOfActivations,
        activatedShares,
        earnedShares,
        btcBalanceConfirmed: confirmed,
        btcBalancePending: unconfirmed,
        shareOptions: available,
        unactivatedShareOptions: unactivated,
        userWallet, // Returned for use in child resolver
      };
      logger.JSON.debug(shareConfig);
      return shareConfig;
    } catch (error) {
      logger.obj.warn({ error });
    }
  };

  public shareUrl = async (
    parent: {
      activated: boolean;
      userWallet: IUserWallet;
      numberOfActivations: string;
    },
    args: {},
    { dataSources: { linkShortener, bitly }, user, logger }: Context,
  ) => {
    try {
      const { userWallet } = parent;

      if (userWallet.shareLink) {
        return userWallet.shareLink;
      }
      const userModel = await user.findFromDb();
      if (!userModel) {
        throw new Error('Not found');
      }
      let url: string;
      try {
        url = await linkShortener.getLink(userModel);
      } catch (error) {
        logger.warn(`resolvers.share.shareUrl.getLink.catch:${error}`);
        url = await bitly.getLink(userModel);
      }
      userModel.set('wallet.shareLink', url);
      await userModel.save();
      return url;
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  };

  public logClick = async (
    parent: any,
    args: { referredBy: string },
    { logger }: Context,
  ) => {
    const { referredBy } = args;
    try {
      const { referrer, brand } = await this.findReferrer(referredBy);
      this.saveClick(referrer.id, brand);
      return {
        firstName: referrer.firstName,
        lastName: referrer.lastName,
      };
    } catch (error) {
      logger.obj.warn({ error, referredBy });
      throw error;
    }
  };
}

const resolvers = new ShareResolver();

export default logResolver({
  Mutation: {
    logClick: resolvers.logClick,
  },
  Query: {
    shareConfig: resolvers.shareConfig,
  },
  ShareConfig: {
    shareUrl: resolvers.shareUrl,
  },
});
