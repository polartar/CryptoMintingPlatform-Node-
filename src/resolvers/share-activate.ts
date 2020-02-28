import ResolverBase from '../common/Resolver-Base';
import { config, logger as globalLogger } from '../common';
import { ISendOutput, Context, IWalletConfig, IUser } from '../types';
import { rewardDistributer } from '../services';
import { UnclaimedReward, WalletConfig } from '../models';
import { logResolver, Logger } from '../common/logger';
import { WalletApi } from '../wallet-api';
import { UserApi, SendEmail } from '../data-sources';

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

class Resolvers extends ResolverBase {
  private usdToBtc = (btcUsdPrice: number, amount: number) => {
    const btcPriceInCents = Math.round(btcUsdPrice * 100);
    return Math.round(amount * 100) / btcPriceInCents;
  };

  private isReferrerEligible = (
    referrer: IUser,
    allRewardConfigs: IWalletConfig[],
  ) => {
    if (!referrer) return false;
    const sharesPerUpgrade = new Map<string, number>();
    allRewardConfigs.forEach(({ rewardCurrency, shareLimit }) =>
      sharesPerUpgrade.set(rewardCurrency.toLowerCase(), shareLimit),
    );
    const { softNodeLicenses, wallet } = referrer.toJSON();

    const licenseCount = Object.values(softNodeLicenses || {}).reduce(
      (acc: number, numLicenses: number) => {
        return isNaN(+numLicenses) ? acc : acc + numLicenses;
      },
      0,
    ) as number;
    const earnedFromUpgrades = Object.entries(wallet?.activations || {}).reduce(
      (acc: number, [name, upgrade]: [string, { activated: boolean }]) => {
        return upgrade?.activated
          ? sharesPerUpgrade.get(name.toLowerCase()) + acc
          : acc;
      },
      0,
    );
    const earnedFromUpgradesWithMin =
      earnedFromUpgrades > 5 ? earnedFromUpgrades : 5;
    const sharesCount = Object.values(wallet?.shares || {}).reduce(
      (acc: number, shares: number) => {
        return isNaN(+shares) ? acc : acc + shares;
      },
      0,
    );
    const earnedFromSoftnodes = licenseCount * config.sharesPerSoftNodeLicense;
    const earnedShares = earnedFromSoftnodes + earnedFromUpgradesWithMin;
    const aboveShareLimit = sharesCount >= earnedShares;
    if (aboveShareLimit || !referrer?.wallet?.btcAddress) {
      return false;
    }
    return true;
  };

  private getExtraCostForLootBoxes = (
    numLootBoxes: number = 1,
    rewardConfig: IRewardConfig,
  ) => {
    if (rewardConfig.rewardCurrency.toLowerCase() === 'arcade') {
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

  private getPaymentDetails = (
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

  private logMissedReferrerBtcReward = async (
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

  private async getOutputs(
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

  private saveActivationToDb = (
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
    userDoc.set(`${prefix}.activated`, true);
    userDoc.set(`${prefix}.activationTxHash`, transactionId);
    userDoc.set(`${prefix}.btcUsdPrice`, btcUsdPrice);
    userDoc.set(`${prefix}.btcToReferrer`, btcToReferrer);
    userDoc.set(`${prefix}.btcToCompany`, btcToCompany);
    userDoc.set(`${prefix}.timestamp`, new Date());
    userDoc.set(`${prefix}.amountRewarded`, amountRewarded);
    userDoc.set(`${prefix}.rewardId`, rewardId);
    userDoc.set(`${prefix}.itemsRewarded`, itemsRewarded);
    userDoc.set(`${prefix}.lootBoxesPurchased`, lootBoxesPurchased);
    userDoc.set(`${prefix}.lootBoxExtraPaid`, lootBoxExtraPaid);
    userDoc.set(`${prefix}.lootBoxPriceUsd`, config.costPerLootBox);

    return userDoc.save();
  };

  private getAllRewardConfigs = async () => {
    const { brand } = config;
    const rewardConfigs = await WalletConfig.find({ brand });

    return rewardConfigs;
  };

  private selectRewardConfig = (
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

  private sendRewards = async (
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

  private emailReferrerAndIncrementUsedShares = (
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

  public shareActivate = async (
    parent: any,
    args: {
      walletPassword: string;
      rewardType: string;
      numLootBoxes: number;
    },
    {
      wallet,
      user,
      logger,
      dataSources: { cryptoFavorites, sendEmail },
    }: Context,
  ) => {
    const rewardType = args.rewardType.toLowerCase();
    const { walletPassword, numLootBoxes } = args;
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

      this.saveActivationToDb(
        userFromDb,
        rewardType,
        { ...paymentDetails, transactionId: transaction.id, outputs },
        rewardResult,
        rewardConfig.softnodeType,
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

const resolvers = new Resolvers();

export default logResolver({
  Mutation: {
    shareActivate: resolvers.shareActivate,
  },
});
