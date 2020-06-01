import { config } from '../common';
import { gameItemService } from '../services';
import { WalletConfig } from '../models';
import { logResolver } from '../common/logger';
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

  shareActivate = async (
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
    const REWARD_TYPE = 'gala';
    const { walletPassword, numLootBoxes = 1, orderContext = {} } = args;
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
      this.throwIfIneligibleForUpgrade(userFromDb, REWARD_TYPE);
      const paymentDetails = await this.getPaymentDetails(
        rewardConfig,
        btcUsdPrice,
        referrer,
        this.isGalaReferrerEligible(referrer),
        numLootBoxes,
      );
      const outputs = await this.getOutputs(
        paymentDetails.btcToCompany,
        paymentDetails.btcToReferrer,
        referrer?.wallet?.btcAddress,
        REWARD_TYPE,
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

      const itemsRewarded = await this.assignGameItem(
        user.userId,
        userFromDb?.wallet?.ethAddress,
        numLootBoxes,
      );

      const rewardResult = {
        rewardId: '',
        amountRewarded: 0,
        itemsRewarded,
      };

      await rewardTrigger.triggerAction(
        RewardActions.UPGRADED,
        rewardTrigger.getUserHelper(userFromDb),
      );

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

export default logResolver({
  Mutation: {
    galaShareActivate: resolvers.shareActivate,
  },
});
