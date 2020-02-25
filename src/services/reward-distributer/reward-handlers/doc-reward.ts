import { config } from '../../../common';
import { Logger } from '../../../common/logger';
import { PromotionalReward } from '../../../models';

class DocReward {
  rewardNameFromCurrency = new Map([
    ['winx', 'WinX'],
    ['green', 'GREEN'],
    ['smart', 'Smart'],
    ['arcade', 'Arc'],
    ['arc', 'Arc'],
  ]);

  private getRewardName = (currency: string) => {
    const selectedReward = this.rewardNameFromCurrency.get(
      currency.toLowerCase(),
    );
    if (!selectedReward) {
      throw new Error(`No reward name for currency ${currency}`);
    }
    return selectedReward;
  };

  public send = async (
    rewardCurrency: string,
    rewardAmount: number,
    userId: string,
    logger: Logger,
  ): Promise<string> => {
    const rewardName = this.getRewardName(rewardCurrency);
    logger.obj.debug({ rewardName });
    const { id: createdRecordId } = await PromotionalReward.create({
      rewardType: 'wallet',
      amount: rewardAmount,
      environmentType: config.brand,
      userId,
      rewardName,
    });
    logger.obj.debug({ createdRecordId });
    return createdRecordId;
  };
}

export const docReward = new DocReward();
