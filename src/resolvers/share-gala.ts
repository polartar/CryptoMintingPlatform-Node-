import { config } from '../common';
import { ShareResolver } from './share';
import { Context } from '../types';
import {
  referralRewardsPipeline,
  alfaFountainSharesPipeline,
} from '../pipelines';
import { default as User } from '../models/user';
import { Erc1155Token } from '../models';
import { logResolver } from '../common/logger';

export class GalaShareResolver extends ShareResolver {
  private getRewardTotals = async (userId: string) => {
    const [result] = await User.aggregate(referralRewardsPipeline(userId));

    return (
      result || {
        btcEarned: 0,
        friendsJoined: 0,
        galaEarned: 0,
        nodesPurchased: 0,
        upgradedReferrals: 0,
      }
    );
  };

  public galaShareConfig = async (
    parent: any,
    args: {},
    { user, wallet, logger, dataSources: { cryptoFavorites } }: Context,
  ) => {
    this.requireAuth(user);
    // this.requireBrand().toBeIn(['arcade', 'gala']);
    try {
      const { brand } = config;
      const dbUser = await user.findFromDb();

      const {
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      } = await this.getShareConfigs(dbUser);
      const btcUsdPrice = await cryptoFavorites.getBtcUsdPrice();
      logger.JSON.debug({
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      });
      const userWallet = dbUser?.wallet;
      if (!userWallet) throw new Error('User wallet not initialized');
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      logger.JSON.debug({ confirmed, unconfirmed });
      const activatedShares =
        (userWallet && userWallet.shares && userWallet.shares[brand]) || 0;
      logger.obj.debug({ activatedShares });
      const [
        {
          referrerReward,
          companyFee,
          rewardCurrency,
          rewardAmount,
          userBalanceThreshold,
          upgradeBenefits,
          basicWalletBenefits,
        },
      ] = available;
      const {
        btcEarned,
        friendsJoined,
        galaEarned,
        nodesPurchased,
        upgradedReferrals,
      } = await this.getRewardTotals(dbUser.id);
      return {
        userWallet, // required for sub-resolver
        goldMember: !!userWallet?.activations?.gala?.activated,
        btcBalanceConfirmed: confirmed,
        btcBalancePending: unconfirmed,
        referrerReward,
        companyFee,
        rewardCurrency,
        rewardAmount,
        userBalanceThreshold,
        upgradeBenefits,
        basicWalletBenefits,
        galaRewards: {
          earned: galaEarned.toFixed(8),
          usd: '0',
        },
        btcRewards: {
          earned: btcEarned,
          usd: (btcUsdPrice * btcEarned).toFixed(8),
        },
        referralOutcomes: {
          friendsJoined,
          goldMembers: upgradedReferrals,
          nodesPurchased,
        },
      };
    } catch (error) {
      logger.obj.warn({ error });
    }
  };

  townStarRewards = async (parent: any, args: {}, context: Context) => {
    this.requireAuth(context.user);
    const result = await Erc1155Token.aggregate(
      alfaFountainSharesPipeline(context.user.userId),
    );

    return result;
  };
}

const resolvers = new GalaShareResolver();

export default logResolver({
  Query: {
    galaShareConfig: resolvers.galaShareConfig,
  },
  GalaShareConfig: {
    shareUrl: resolvers.shareUrl,
    townStarRewards: resolvers.townStarRewards,
  },
});