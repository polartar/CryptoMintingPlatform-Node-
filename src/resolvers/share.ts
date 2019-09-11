import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { config } from '../common';
import { IWalletEnvironment } from '../models/environment';

class Resolvers extends ResolverBase {
  public async shareConfig(
    parent: any,
    args: {},
    { dataSources: { environment } }: Context,
  ) {
    const {
      walletCompanyFee: companyFee,
      walletReferrerReward: referrerReward,
      walletRewardAmount: rewardAmount,
      walletRewardCurrency: rewardCurrency,
      walletShareLimit: shareLimit,
      walletUserBalanceThreshold: userBalanceThreshold,
    } = (await environment.findOne({
      domain: config.hostname,
    })) as IWalletEnvironment;
    return {
      referrerReward,
      companyFee,
      rewardCurrency,
      rewardAmount,
      userBalanceThreshold,
      shareLimit,
    };
  }
  // public async shareUser(
  //   parent: any,
  //   args: {},
  //   context: Context
  // ) {
  // }
}

const resolvers = new Resolvers();

export default {
  Query: {
    shareConfig: resolvers.shareConfig,
    // shareUser: resolvers.shareUser,
  },
};
