import { BaseReward } from './base-reward';
import { coinSymbolToCoinConfig } from '../../../common';
import { IRewardAmounts } from '../../../types';

export abstract class WalletReward extends BaseReward {
  constructor(
    currencySymbol: string,
    amounts: IRewardAmounts,
    valueRequired?: number,
  ) {
    super(coinSymbolToCoinConfig.get(currencySymbol), amounts, valueRequired);
  }
}
