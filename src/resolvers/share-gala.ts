import { config } from '../common';
import { ShareResolver } from './share';
import { Context, IUserWallet } from '../types';
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
    console.log('getRewardTotals::1:result', result);
    return (
      result || {
        btcEarned: 0,
        friendsJoined: 0,
        friendsPlayed: 0,
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
      console.log('galaShareConfig::1:brand', brand);
      const dbUser = await user.findFromDb();
      console.log('galaShareConfig::2:user', dbUser.id);

      const {
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      } = await this.getShareConfigs(dbUser);
      console.log('galaShareConfig::3:available', available);
      console.log('galaShareConfig::4:unactivated', unactivated);
      console.log('galaShareConfig::5:earnedShares', earnedShares);
      console.log(
        'galaShareConfig::6:numberOfActivations',
        numberOfActivations,
      );
      const btcUsdPrice = await cryptoFavorites.getBtcUsdPrice();
      console.log('galaShareConfig::7:btcUsdPrice', btcUsdPrice);
      logger.JSON.debug({
        available,
        unactivated,
        earnedShares,
        numberOfActivations,
      });
      const userWallet = dbUser?.wallet;
      console.log(
        'galaShareConfig::8:userWallet.shares',
        userWallet && userWallet.shares,
      );
      if (!userWallet) throw new Error('User wallet not initialized');
      const { confirmed, unconfirmed } = await wallet
        .coin('btc')
        .getBalance(user.userId);
      console.log('galaShareConfig::9:confirmed', confirmed);
      console.log('galaShareConfig::10:unconfirmed', unconfirmed);
      logger.JSON.debug({ confirmed, unconfirmed });
      const activatedShares =
        (userWallet && userWallet.shares && userWallet.shares[brand]) || 0;
      console.log('galaShareConfig::11:ac', unconfirmed);
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
      console.log('galaShareConfig::12:referrerReward', referrerReward);
      console.log('galaShareConfig::13:companyFee', companyFee);
      console.log('galaShareConfig::14:rewardCurrency', rewardCurrency);
      console.log('galaShareConfig::15:rewardAmount', rewardAmount);
      console.log(
        'galaShareConfig::16:userBalanceThreshold',
        userBalanceThreshold,
      );
      console.log('galaShareConfig::17:upgradeBenefits', upgradeBenefits);
      console.log(
        'galaShareConfig::18:basicWalletBenefits',
        basicWalletBenefits,
      );
      const {
        btcEarned,
        friendsJoined,
        friendsPlayed,
        galaEarned,
        nodesPurchasedByReferrals,
        nodesOwned,
        upgradedReferrals,
      } = await this.getRewardTotals(dbUser.id);
      console.log('galaShareConfig::19:btcEarned', btcEarned);
      console.log('galaShareConfig::20:friendsJoined', friendsJoined);
      console.log('galaShareConfig::21:friendsPlayed', friendsPlayed);
      console.log('galaShareConfig::22:galaEarned', galaEarned);
      console.log(
        'galaShareConfig::23:nodesPurchasedByReferrals',
        nodesPurchasedByReferrals,
      );
      console.log('galaShareConfig::24:nodesOwned', nodesOwned);
      console.log('galaShareConfig::25:upgradedReferrals', upgradedReferrals);
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
        nodesOwned,
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
          friendsPlayed,
          goldMembers: upgradedReferrals,
          nodesPurchasedByReferrals,
        },
      };
    } catch (error) {
      console.log('galaShareConfig::24:catch', error.stack);
      logger.obj.warn({ error });
    }
  };

  townStarRewards = async (
    { userWallet }: { userWallet: IUserWallet },
    args: {},
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const result = await Erc1155Token.aggregate(
      alfaFountainSharesPipeline(userWallet.ethAddress),
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
