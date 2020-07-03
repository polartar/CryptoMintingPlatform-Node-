import { BaseReward } from './base-reward';
import { symbolToWalletConfig } from '../../../common';
import { IRewardTriggerConfig } from '../../../types';

export abstract class WalletReward extends BaseReward {
  constructor(
    currencySymbol: string,
    rewardTriggerConfig: IRewardTriggerConfig,
  ) {
    super(
      symbolToWalletConfig.get(currencySymbol.toLowerCase()),
      rewardTriggerConfig,
    );
  }
}
