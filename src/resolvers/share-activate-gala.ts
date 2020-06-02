import { config, logDebug } from '../common';
import { gameItemService } from '../services';
import { WalletConfig } from '../models';
import { ShareActivateResolvers } from './share-activate';
import { rewardTrigger } from '../services/reward-distributor/reward-distributor-triggers';
import { Context, IUser, IOrderContext, RewardActions } from '../types';

class GalaShareUpgradeResolvers extends ShareActivateResolvers {
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
}

const resolvers = new GalaShareUpgradeResolvers();

export default {
  Mutation: {
    galaShareActivate: resolvers.galaShareActivate,
  },
};
