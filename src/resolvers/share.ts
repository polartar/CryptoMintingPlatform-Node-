import ResolverBase from '../common/Resolver-Base';
import { config } from '../common';
import {
  default as WalletConfig,
  IWalletConfig,
} from '../models/wallet-config';
import { IUserWallet, ISendOutput, Context } from '../types';
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
import { logResolver } from '../common/logger';

interface IActivationPayment {
  outputs: { amount: string; to: string }[];
  btcUsdPrice: number;
  btcToCompany: number;
  btcToReferrer: number;
}

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

  private async getShareConfigs(user: IUser) {
    try {
      const { softNodeLicenses } = user.toJSON();
      const {
        alreadyActivated,
        numberOfActivations,
      } = this.getAlreadyActivated(user.wallet);
      const available = await WalletConfig.find({ brand: config.brand });
      if (!available.length) throw new Error(`Share config not found.`);
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

      const activationShares = activated.reduce(
        (total, curr) => total + curr.shareLimit,
        0,
      );
      const softNodeShares = Object.values(softNodeLicenses).reduce(
        (accum: number, curr: number) => {
          if (isNaN(+curr)) {
            return accum;
          }
          return accum + curr * config.sharesPerSoftNodeLicense;
        },
        0,
      ) as number;
      return {
        available,
        unactivated,
        earnedShares: activationShares + softNodeShares,
        numberOfActivations,
      };
    } catch (error) {
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

  private getAlreadyActivated(userWallet: IUserWallet) {
    if (!userWallet || !userWallet.activations) {
      return {
        alreadyActivated: [],
        numberOfActivations: 0,
      };
    }
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
    return {
      alreadyActivated,
      numberOfActivations,
    };
  }

  public async shareConfig(
    parent: any,
    args: {},
    { user, wallet, logger }: Context,
  ) {
    this.requireAuth(user);
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
  }

  public async shareUrl(
    parent: {
      activated: boolean;
      userWallet: IUserWallet;
      numberOfActivations: string;
    },
    args: {},
    { dataSources: { bitly }, user, logger }: Context,
  ) {
    try {
      const { activated, userWallet, numberOfActivations } = parent;
      logger.JSON.debug({
        activated,
        userWallet: userWallet && userWallet.shareLink,
      });
      if (!numberOfActivations) return null;
      if (userWallet.shareLink) {
        return userWallet.shareLink;
      }
      const userModel = await user.findFromDb();
      if (!userModel) {
        throw new Error('Not found');
      }
      const { affiliateId } = userModel;
      logger.obj.debug({ affiliateId });

      const url = await bitly.getLink(affiliateId);
      logger.obj.debug({ url });
      userModel.set('wallet.shareLink', url);
      await userModel.save();
      logger.debug(`usermodel.save(): done`);
      return url;
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  }

  public async logClick(
    parent: any,
    args: { referredBy: string },
    { logger }: Context,
  ) {
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
  }

  private usdToBtc(btcUsdPrice: number, amount: number) {
    const btcPriceInCents = Math.round(btcUsdPrice * 100);
    return Math.round(amount * 100) / btcPriceInCents;
  }

  private async isReferrerEligible(referrer: IUser, rewardType: string) {
    if (!referrer) return false;
    const { earnedShares, numberOfActivations } = await this.getShareConfigs(
      referrer,
    );
    const aboveShareLimit = numberOfActivations >= earnedShares;
    if (aboveShareLimit || !referrer.wallet || !referrer.wallet.btcAddress) {
      return false;
    }
    return true;
  }

  private async getOutputs(
    companyFee: number,
    referrerReward: number,
    btcPrice: number,
    referrer: IUser,
    rewardType: string,
  ) {
    const { companyFeeBtcAddresses } = config;
    const isReferrerEligible = await this.isReferrerEligible(
      referrer,
      rewardType,
    );
    const companyPortion = this.usdToBtc(btcPrice, companyFee);
    const referrerPortion = this.usdToBtc(btcPrice, referrerReward);
    const companyBtcAddress = companyFeeBtcAddresses[rewardType.toLowerCase()];
    if (!companyBtcAddress) {
      throw new Error(`BTC address not found for reward: ${rewardType}`);
    }

    let btcToCompany: number;
    let btcToReferrer: number;
    let outputs: ISendOutput[];
    if (isReferrerEligible) {
      btcToReferrer = +referrerPortion.toFixed(8);
      btcToCompany = +companyPortion.toFixed(8);
      outputs = [
        {
          to: companyBtcAddress,
          amount: companyPortion.toFixed(8),
        },
        {
          to: referrer.wallet.btcAddress,
          amount: referrerPortion.toFixed(8),
        },
      ];
    } else {
      btcToReferrer = 0;
      btcToCompany = +(companyPortion + referrerPortion).toFixed(8);
      outputs = [
        {
          to: companyBtcAddress,
          amount: (companyPortion + referrerPortion).toFixed(8),
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
    return {
      outputs,
      btcToReferrer,
      btcToCompany,
      btcUsdPrice: btcPrice,
    };
  }

  private saveActivationToDb(
    userDoc: IUser,
    rewardType: string,
    paymentDetails: IActivationPayment & { transactionId: string },
    rewardResult: { amountRewarded: number; rewardId: string },
  ) {
    const {
      transactionId,
      btcUsdPrice,
      btcToReferrer,
      btcToCompany,
    } = paymentDetails;
    const { amountRewarded, rewardId } = rewardResult;
    const prefix = `wallet.activations.${rewardType}`;
    const permission = `${rewardType}-soft-node-discount`;
    userDoc.permissions.push(permission);
    userDoc.set(`${prefix}.activated`, true);
    userDoc.set(`${prefix}.activationTxHash`, transactionId);
    userDoc.set(`${prefix}.btcUsdPrice`, btcUsdPrice);
    userDoc.set(`${prefix}.btcToReferrer`, btcToReferrer);
    userDoc.set(`${prefix}.btcToCompany`, btcToCompany);
    userDoc.set(`${prefix}.timestamp`, new Date());
    userDoc.set(`${prefix}.amountRewarded`, amountRewarded);
    userDoc.set(`${prefix}.rewardId`, rewardId);

    return userDoc.save();
  }

  public async shareActivate(
    parent: any,
    args: {
      walletPassword: string;
      rewardType: string;
    },
    {
      wallet,
      user,
      logger,
      dataSources: { cryptoFavorites, sendEmail },
    }: Context,
  ) {
    // in all environments except arcade, company fee address and partner fee address are the same in the .env
    const { brand } = config;
    const rewardType = args.rewardType.toLowerCase();
    logger.obj.debug({ rewardType });
    this.requireAuth(user);
    try {
      const dbUser = await user.findFromDb();
      const { referrer } = await this.findReferrer(dbUser.referredBy).catch(
        () => ({ referrer: null }),
      );

      const [[{ price }], shareConfigUser] = await Promise.all([
        cryptoFavorites.getUserFavorites(['BTC']),
        this.getShareConfigs(dbUser),
      ]);

      const [rewardConfigUser] = shareConfigUser.available.filter(
        configItem => configItem.rewardCurrency === args.rewardType,
      );

      if (!rewardConfigUser) {
        throw new Error(`Reward currency: ${rewardType} not supported`);
      }

      // Check if user has already activated for this currency type.
      if (
        !dbUser ||
        !dbUser.wallet ||
        (dbUser.wallet.activations &&
          dbUser.wallet.activations[rewardType] &&
          dbUser.wallet.activations[rewardType].activated)
      ) {
        throw new Error(`User inelligible for activation`);
      }

      const paymentDetails = await this.getOutputs(
        rewardConfigUser.companyFee,
        rewardConfigUser.referrerReward,
        price,
        referrer,
        args.rewardType,
      );
      logger.JSON.debug(paymentDetails);
      const { message, transaction, success } = await wallet
        .coin('btc')
        .send(user, paymentDetails.outputs, args.walletPassword);
      logger.JSON.debug({ message, success, transaction });
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

      const userEthAddress =
        (dbUser && dbUser.wallet && dbUser.wallet.ethAddress) || '';
      const rewardResult = await rewardDistributer.sendReward(
        rewardConfigUser,
        user.userId,
        userEthAddress,
        logger,
      );

      this.saveActivationToDb(
        dbUser,
        rewardType,
        { ...paymentDetails, transactionId: transaction.id },
        rewardResult,
      );
      sendEmail.sendSoftNodeDiscount(dbUser);
      if (referrer && paymentDetails.outputs.length >= 2) {
        sendEmail.referrerActivated(referrer, dbUser);
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
      logger.obj.warn({ error });
      throw error;
    }
  }
}

const resolvers = new Resolvers();

export default logResolver({
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
});
