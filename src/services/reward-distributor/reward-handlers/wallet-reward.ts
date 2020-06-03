import { BaseReward } from './base-reward';
import { coinSymbolToCoinConfig } from '../../../common';
import { IRewardTriggerConfig } from '../../../types';

export abstract class WalletReward extends BaseReward {
  constructor(
    currencySymbol: string,
    rewardTriggerConfig: IRewardTriggerConfig,
  ) {
    super(
      coinSymbolToCoinConfig.get(currencySymbol.toLowerCase()),
      rewardTriggerConfig,
    );
  }
}
