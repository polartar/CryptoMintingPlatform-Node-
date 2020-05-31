import { BaseReward } from './base-reward';
import { itemRewardConfig } from '../../../common';
import { ItemTokenName, IRewardAmounts } from '../../../types';

export abstract class ItemReward extends BaseReward {
  protected supplyWarnThreshold: number;

  constructor(
    itemName: ItemTokenName,
    amounts: IRewardAmounts,
    requiredValue?: number,
  ) {
    const rewardItemConfig = itemRewardConfig.get(itemName);
    super(rewardItemConfig, amounts, requiredValue);
    this.supplyWarnThreshold = rewardItemConfig.supplyWarnThreshold;
  }
}
