import ResolverBase from '../common/Resolver-Base';
import { config, logger as globalLogger } from '../common';
import {
  ISendOutput,
  Context,
  IWalletConfig,
  IUser,
  IGameOrderBtc,
  IOrderContext,
  RewardActions,
} from '../types';
import { rewardDistributer, gameItemService } from '../services';
import {
  UnclaimedReward,
  WalletConfig,
  GameOrder,
  GameProduct,
} from '../models';
import { logResolver, Logger, logDebug } from '../common/logger';
import { WalletApi } from '../wallet-api';
import { UserApi, SendEmail } from '../data-sources';
import { rewardTrigger } from '../services/reward-distributor/reward-distributor-triggers';

interface IActivationPayment {
  btcUsdPrice: number;
  btcToCompany: number;
  btcToReferrer: number;
  lootBoxExtraPaid: number;
  lootBoxesPurchased: number;
}

interface IRewardConfig {
  companyFee: number;
  referrerReward: number;
  rewardAmount: number;
  rewardCurrency: string;
  softnodePhoto: string;
  softnodeType: string;
  upgradeAccountName: string;
}

export class ShareActivateResolvers extends ResolverBase {
  private isGalaReferrerEligible = (referrer: IUser) => {
    return !!referrer?.wallet?.activations?.gala?.activated;
  };

  private getRewardconfig = async () => {
    const { brand } = config;
    const rewardConfig = await WalletConfig.findOne({ brand });
    const {
      referrerReward,
      companyFee,
      rewardAmount,
      rewardCurrency,
      coupon: { photo: softnodePhoto, softnodeType },
      upgradeAccountName,
    } = rewardConfig;

    return {
      companyFee,
      referrerReward,
      rewardAmount,
      rewardCurrency,
      softnodePhoto,
      softnodeType,
      upgradeAccountName,
    };
  };

  private assignGameItem = (
    userId: string,
    userEthAddress: string,
    quantity: number,
  ) => {
    return gameItemService.assignItemsToUser(userId, userEthAddress, quantity);
  };

  galaShareActivate = async (
    parent: any,
    args: {
      walletPassword: string;
      numLootBoxes: number;
      orderContext: IOrderContext;
    },
    {
      wallet,
      user,
      logger,
      dataSources: { cryptoFavorites, sendEmail },
    }: Context,
  ) => {
    logDebug('galaShareActivate', 'user', user.userId);
    const REWARD_TYPE = 'gala';
    const { walletPassword, numLootBoxes = 1, orderContext = {} } = args;
    logDebug('galaShareActivate', 'numLootBoxes', numLootBoxes);
    this.requireAuth(user);
    try {
      const [
        { userFromDb, referrer },
        btcUsdPrice,
        rewardConfig,
      ] = await Promise.all([
        user.findUserAndReferrer(),
        cryptoFavorites.getBtcUsdPrice(),
        this.getRewardconfig(),
      ]);
      logDebug(
        'galaShareActivate',
        'rewardConfig.companyFee',
        rewardConfig.companyFee,
      );
      logDebug(
        'galaShareActivate',
        'rewardConfig.referrerReward',
        rewardConfig.referrerReward,
      );
      logDebug(
        'galaShareActivate',
        'rewardConfig.rewardAmount',
        rewardConfig.rewardAmount,
      );
      logDebug(
        'galaShareActivate',
        'rewardConfig.rewardCurrency',
        rewardConfig.rewardCurrency,
      );
      logDebug(
        'galaShareActivate',
        'rewardConfig.referrerReward',
        rewardConfig.referrerReward,
      );
      this.throwIfIneligibleForUpgrade(userFromDb, REWARD_TYPE);
      const isReferrerEligible = this.isGalaReferrerEligible(referrer);
      logDebug('galaShareActivate', 'isReferrerEligible', isReferrerEligible);
      const paymentDetails = await this.getPaymentDetails(
        rewardConfig,
        btcUsdPrice,
        referrer,
        isReferrerEligible,
        numLootBoxes,
      );
      logDebug(
        'galaShareActivate',
        'paymentDetails.btcToCompany',
        paymentDetails.btcToCompany,
      );
      logDebug(
        'galaShareActivate',
        'paymentDetails.btcToReferre',
        paymentDetails.btcToReferrer,
      );
      logDebug(
        'galaShareActivate',
        'paymentDetails.referrerMissedBtc',
        paymentDetails.referrerMissedBtc,
      );
      logDebug(
        'galaShareActivate',
        'paymentDetails.lootBoxExtraPaid',
        paymentDetails.lootBoxExtraPaid,
      );
      logDebug(
        'galaShareActivate',
        'paymentDetails.lootBoxesPurchase',
        paymentDetails.lootBoxesPurchased,
      );
      const outputs = await this.getOutputs(
        paymentDetails.btcToCompany,
        paymentDetails.btcToReferrer,
        referrer?.wallet?.btcAddress,
        REWARD_TYPE,
      );
      logDebug('galaShareActivate', 'outputs', outputs.length);
      const transaction = await this.sendUpgradeTransaction(
        user,
        wallet,
        walletPassword,
        outputs,
      );
      logDebug('galaShareActivate', 'transaction.id', transaction.id);
      logDebug('galaShareActivate', 'transaction.total', transaction.total);
      logDebug('galaShareActivate', 'referrer', !!referrer);

      this.logMissedReferrerBtcReward(
        referrer,
        paymentDetails.referrerMissedBtc,
      );

      const itemsRewarded = await this.assignGameItem(
        user.userId,
        userFromDb?.wallet?.ethAddress,
        numLootBoxes,
      );
      logDebug('galaShareActivate', 'itemsRewarded', itemsRewarded.length);
      logDebug;
      const rewardResult = {
        rewardId: '',
        amountRewarded: 0,
        itemsRewarded,
      };
      logDebug('galaShareActivate', 'itemsRewarded', itemsRewarded.length);
      logDebug('galaShareActivate', 'callingRewardTrigger', 'before');
      await rewardTrigger.triggerAction(
        RewardActions.UPGRADED,
        rewardTrigger.getUserHelper(userFromDb),
      );
      logDebug('galaShareActivate', 'callingRewardTrigger', 'after');

      this.logGameOrder(
        numLootBoxes,
        paymentDetails.btcToCompany,
        transaction.id,
        user.userId,
        itemsRewarded,
        btcUsdPrice,
        orderContext,
      );

      this.saveActivationToDb(
        userFromDb,
        REWARD_TYPE,
        { ...paymentDetails, transactionId: transaction.id, outputs },
        rewardResult,
        rewardConfig.softnodeType,
        orderContext,
      );

      this.emailReferrerAndIncrementUsedShares(
        referrer,
        userFromDb,
        outputs.length,
        sendEmail,
      );

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  };

  protected usdToBtc = (btcUsdPrice: number, amount: number) => {
    const btcPriceInCents = Math.round(btcUsdPrice * 100);
    return Math.round(amount * 100) / btcPriceInCents;
  };

  protected isReferrerEligible = (
    referrer: IUser,
    allRewardConfigs: IWalletConfig[],
  ) => {
    if (!referrer) return false;
    const { wallet, softNodeLicenses } = referrer.toJSON() as IUser;

    const sharesPerUpgrade = new Map<string, number>();
    const sharesPerSoftnodeType = new Map<string, number>();

    allRewardConfigs.forEach(({ rewardCurrency, shareLimits }) => {
      const { upgradedAccount, softnodeLicense } = shareLimits;

      sharesPerUpgrade.set(rewardCurrency.toLowerCase(), upgradedAccount);
      sharesPerSoftnodeType.set(
        softnodeLicense.softnodeType,
        softnodeLicense.sharesPerLicense,
      );
    });

    const earnedFromUpgrades = Object.entries(wallet?.activations || {}).reduce(
      (acc: number, [name, upgrade]) => {
        return upgrade?.activated
          ? sharesPerUpgrade.get(name.toLowerCase()) + acc
          : acc;
      },
      0,
    );

    const earnedFromSoftnodeLicenses = Object.entries(
      softNodeLicenses || {},
    ).reduce((acc: number, [softnodeType, numberOfLicenses]) => {
      const sharesPerLicense = sharesPerSoftnodeType.get(softnodeType) || 0;

      return acc + sharesPerLicense * numberOfLicenses;
    }, 0);

    const sharesCount = Object.values(wallet?.shares || {}).reduce(
      (acc: number, shares: number) => {
        return isNaN(+shares) ? acc : acc + shares;
      },
      0,
    );

    const earnedShares =
      config.baseNumberOfShares +
      earnedFromUpgrades +
      earnedFromSoftnodeLicenses;
    const aboveShareLimit = sharesCount >= earnedShares;

    if (aboveShareLimit || !referrer?.wallet?.btcAddress) {
      return false;
    }

    return true;
  };

  protected getExtraCostForLootBoxes = (
    numLootBoxes: number = 1,
    rewardConfig: IRewardConfig,
  ) => {
    if (rewardConfig.rewardCurrency.toLowerCase() === 'gala') {
      const extraLootBoxes = (numLootBoxes || 1) > 1 ? numLootBoxes - 1 : 0;
      const lootBoxExtraPaid = extraLootBoxes * config.costPerLootBox;
      return {
        lootBoxesPurchased: extraLootBoxes + 1,
        lootBoxExtraPaid,
      };
    }
    return {
      lootBoxesPurchased: 0,
      lootBoxExtraPaid: 0,
    };
  };

  protected getPaymentDetails = (
    rewardConfig: IRewardConfig,
    btcPrice: number,
    referrer: IUser,
    isReferrerEligible: boolean,
    numLootBoxes: number,
  ) => {
    let btcToCompany: number;
    let btcToReferrer: number;
    const { companyFee, referrerReward } = rewardConfig;
    const {
      lootBoxExtraPaid,
      lootBoxesPurchased,
    } = this.getExtraCostForLootBoxes(numLootBoxes, rewardConfig);
    const companyPortion = this.usdToBtc(
      btcPrice,
      companyFee + lootBoxExtraPaid,
    );
    const referrerPortion = this.usdToBtc(btcPrice, referrerReward);
    const referrerCanReceive = !!referrer?.wallet?.btcAddress;
    if (isReferrerEligible && referrerCanReceive) {
      btcToReferrer = +referrerPortion.toFixed(8);
      btcToCompany = +companyPortion.toFixed(8);
    } else {
      btcToReferrer = 0;
      btcToCompany = +(companyPortion + referrerPortion).toFixed(8);
    }

    // was referrer eligible to receive, but didn't have a wallet set up
    const referrerMissedBtc =
      !referrer || referrerCanReceive ? 0 : +referrerPortion.toFixed(8);

    return {
      btcToCompany,
      btcToReferrer,
      referrerMissedBtc,
      btcUsdPrice: btcPrice,
      lootBoxExtraPaid,
      lootBoxesPurchased,
    };
  };

  protected logMissedReferrerBtcReward = async (
    referrer: IUser,
    referrerMissedBtc: number,
  ) => {
    try {
      if (referrerMissedBtc > 0) {
        UnclaimedReward.create({
          userId: referrer.id,
          btcValue: referrerMissedBtc,
          hasWalletProperty: !!referrer.wallet,
        });
      }
    } catch (error) {
      globalLogger.warn(error);
    }
  };

  protected async getOutputs(
    btcToCompany: number,
    btcToReferrer: number,
    referrerBtcAddress: string,
    rewardType: string,
  ) {
    const { companyFeeBtcAddresses } = config;

    const companyBtcAddress = companyFeeBtcAddresses[rewardType];
    if (!companyBtcAddress) {
      throw new Error(`BTC address not found for reward: ${rewardType}`);
    }

    const outputs: ISendOutput[] = [
      {
        amount: btcToCompany.toFixed(8),
        to: companyBtcAddress,
      },
      {
        amount: btcToReferrer.toFixed(8),
        to: referrerBtcAddress,
      },
    ].filter(output => +output.amount > 0 && output.to);
    return outputs;
  }

  protected saveActivationToDb = (
    userDoc: IUser,
    rewardType: string,
    paymentDetails: IActivationPayment & {
      transactionId: string;
      outputs: ISendOutput[];
    },
    rewardResult: {
      amountRewarded: number;
      rewardId: string;
      itemsRewarded: string[];
    },
    softnodeType: string,
    orderContext: IOrderContext,
  ) => {
    const {
      transactionId,
      btcUsdPrice,
      btcToReferrer,
      btcToCompany,
      lootBoxesPurchased,
      lootBoxExtraPaid,
    } = paymentDetails;
    const { amountRewarded, rewardId, itemsRewarded } = rewardResult;
    const prefix = `wallet.activations.${rewardType}`;
    const permission = `${softnodeType}-soft-node-discount`;
    userDoc.permissions.push(permission);
    if (rewardType === 'gala') {
      userDoc.permissions.push('TOWNSTAR_BETA_ACCESS');
    }
    userDoc.set(`${prefix}.activated`, true);
    userDoc.set(`${prefix}.activationTxHash`, transactionId);
    userDoc.set(`${prefix}.btcUsdPrice`, btcUsdPrice);
    userDoc.set(`${prefix}.btcToReferrer`, btcToReferrer);
    userDoc.set(`${prefix}.referrerReward.btc.amount`, btcToReferrer);
    userDoc.set(`${prefix}.referrerReward.btc.txId`, transactionId);
    userDoc.set(`${prefix}.btcToCompany`, btcToCompany);
    userDoc.set(`${prefix}.timestamp`, new Date());
    userDoc.set(`${prefix}.amountRewarded`, amountRewarded);
    userDoc.set(`${prefix}.rewardId`, rewardId);
    userDoc.set(`${prefix}.itemsRewarded`, itemsRewarded);
    userDoc.set(`${prefix}.lootBoxesPurchased`, lootBoxesPurchased);
    userDoc.set(`${prefix}.lootBoxExtraPaid`, lootBoxExtraPaid);
    userDoc.set(`${prefix}.lootBoxPriceUsd`, config.costPerLootBox);
    userDoc.set(`${prefix}.context`, orderContext);

    return userDoc.save();
  };

  protected getAllRewardConfigs = async () => {
    const { brand } = config;
    const rewardConfigs = await WalletConfig.find({ brand });

    return rewardConfigs;
  };

  protected selectRewardConfig = (
    rewardType: string,
    rewardConfigs: IWalletConfig[],
  ): IRewardConfig => {
    const selectedRewardConfig = rewardConfigs.find(
      rewardOption => rewardOption.rewardCurrency.toLowerCase() === rewardType,
    );

    if (!selectedRewardConfig) {
      throw new Error(`Reward currency: ${rewardType} not supported`);
    }
    const {
      referrerReward,
      companyFee,
      rewardAmount,
      rewardCurrency,
      coupon: { photo: softnodePhoto, softnodeType },
      upgradeAccountName,
    } = selectedRewardConfig;

    return {
      companyFee,
      referrerReward,
      rewardAmount,
      rewardCurrency,
      softnodePhoto,
      softnodeType,
      upgradeAccountName,
    };
  };

  public throwIfIneligibleForUpgrade = (user: IUser, rewardType: string) => {
    const hasWallet = !!user?.wallet;
    const alreadyActivatedForRewardType =
      user?.wallet?.activations?.[rewardType]?.activated;

    if (!hasWallet || alreadyActivatedForRewardType) {
      throw new Error(`User inelligible for activation`);
    }
  };

  public sendUpgradeTransaction = async (
    user: UserApi,
    wallet: WalletApi,
    walletPassword: string,
    outputs: ISendOutput[],
  ) => {
    const { message, transaction, success } = await wallet
      .coin('btc')
      .send(user, outputs, walletPassword);

    if (!success) {
      throw new Error(message || 'Activation transaction failed');
    }

    return transaction;
  };

  protected sendRewards = async (
    user: IUser,
    rewardConfig: IRewardConfig,
    numLootBoxes: number,
    sendEmail: SendEmail,
    logger: Logger,
  ) => {
    const userEthAddress = user?.wallet?.ethAddress || '';
    const [rewardResult] = await Promise.all([
      rewardDistributer.sendReward(
        rewardConfig.rewardAmount,
        rewardConfig.rewardCurrency,
        user.id,
        userEthAddress,
        numLootBoxes,
        logger,
      ),
      sendEmail.sendSoftNodeDiscount(
        user,
        rewardConfig.upgradeAccountName,
        rewardConfig.softnodePhoto,
        rewardConfig.softnodeType,
      ),
    ]);

    return rewardResult;
  };

  protected emailReferrerAndIncrementUsedShares = (
    referrer: IUser,
    userReferred: IUser,
    outputsLength: number,
    sendEmail: SendEmail,
  ) => {
    const { brand } = config;
    if (referrer && outputsLength >= 2) {
      sendEmail.referrerActivated(referrer, userReferred);
      const existingShares = referrer?.wallet?.shares?.[brand] || 0;
      referrer.set(`wallet.shares.${brand}`, existingShares + 1);
      referrer.save();
    }
  };

  protected logGameOrder = async (
    quantity: number,
    totalBtc: number,
    txHash: string,
    userId: string,
    itemsReceived: string[],
    btcUsdPrice: number,
    orderContext: IOrderContext,
  ) => {
    const product = await GameProduct.findOne({ name: 'FarmBot Crate' }).exec();
    const newGameOrder: IGameOrderBtc = {
      isUpgradeOrder: true,
      quantity,
      totalBtc,
      txHash,
      userId,
      itemsReceived,
      created: new Date(),
      btcUsdPrice,
      gameProductId: product._id,
      perUnitPriceUsd: product.priceUsd,
      context: orderContext,
    };
    return GameOrder.create(newGameOrder);
  };

  shareActivate = async (
    parent: any,
    args: {
      walletPassword: string;
      rewardType: string;
      numLootBoxes: number;
      orderContext: IOrderContext;
    },
    ctx: Context,
  ) => {
    if (config.brand === 'gala') {
      return this.galaShareActivate(parent, args, ctx);
    }
    const {
      wallet,
      user,
      logger,
      dataSources: { cryptoFavorites, sendEmail },
    } = ctx;
    const rewardType = args.rewardType.toLowerCase();
    const { walletPassword, numLootBoxes, orderContext = {} } = args;
    logger.obj.debug({ rewardType });
    this.requireAuth(user);
    try {
      const [
        { userFromDb, referrer },
        btcUsdPrice,
        allRewardConfigs,
      ] = await Promise.all([
        user.findUserAndReferrer(),
        cryptoFavorites.getBtcUsdPrice(),
        this.getAllRewardConfigs(),
      ]);
      const rewardConfig = this.selectRewardConfig(
        rewardType,
        allRewardConfigs,
      );
      this.throwIfIneligibleForUpgrade(userFromDb, rewardType);
      const paymentDetails = await this.getPaymentDetails(
        rewardConfig,
        btcUsdPrice,
        referrer,
        this.isReferrerEligible(referrer, allRewardConfigs),
        numLootBoxes,
      );
      const outputs = await this.getOutputs(
        paymentDetails.btcToCompany,
        paymentDetails.btcToReferrer,
        referrer?.wallet?.btcAddress,
        rewardType,
      );
      logger.JSON.debug(paymentDetails);

      const transaction = await this.sendUpgradeTransaction(
        user,
        wallet,
        walletPassword,
        outputs,
      );

      this.logMissedReferrerBtcReward(
        referrer,
        paymentDetails.referrerMissedBtc,
      );

      const rewardResult = await this.sendRewards(
        userFromDb,
        rewardConfig,
        paymentDetails.lootBoxesPurchased,
        sendEmail,
        logger,
      );

      this.logGameOrder(
        numLootBoxes,
        paymentDetails.btcToCompany,
        transaction.id,
        user.userId,
        rewardResult.itemsRewarded,
        btcUsdPrice,
        orderContext,
      );

      this.saveActivationToDb(
        userFromDb,
        rewardType,
        { ...paymentDetails, transactionId: transaction.id, outputs },
        rewardResult,
        rewardConfig.softnodeType,
        orderContext,
      );

      this.emailReferrerAndIncrementUsedShares(
        referrer,
        userFromDb,
        outputs.length,
        sendEmail,
      );

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  };
}

const resolvers = new ShareActivateResolvers();

export default logResolver({
  Mutation: {
    shareActivate: resolvers.shareActivate,
  },
});
