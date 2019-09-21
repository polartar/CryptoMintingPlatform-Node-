import { IShareConfig } from '../types';
import { LicenseReward } from '../models';
import { config, logger } from '../common';
import autoBind = require('auto-bind');

class RewardDistributer {
  constructor() {
    autoBind(this);
  }

  private getRewardName(currency: string) {
    logger.debug(
      `services.rewardDistributer.getRewardName.currency: ${currency}`,
    );
    let selectedReward;
    switch (currency.toLowerCase()) {
      case 'winx': {
        selectedReward = 'WinX';
        break;
      }
      case 'green': {
        selectedReward = 'GREEN';
        break;
      }
      case 'smart': {
        selectedReward = 'Smart';
        break;
      }
      case 'arcade': {
        selectedReward = 'Arc';
        break;
      }
      case 'arc': {
        selectedReward = 'Arc';
        break;
      }
      default: {
        throw new Error(`No reward name for currency ${currency}`);
      }
    }
    logger.debug(
      `services.rewardDistributer.getRewardName.currency, selectedReward: ${currency}, ${selectedReward}`,
    );

    return selectedReward;
  }

  public async sendReward(rewardConfig: IShareConfig, userId: string) {
    logger.debug(`services.rewardDistributer.userId: ${userId}`);
    const { rewardAmount, rewardCurrency } = rewardConfig;
    logger.debug(`services.rewardDistributer.userId: ${rewardAmount}`);
    logger.debug(`services.rewardDistributer.userId: ${userId}`);
    const rewardName = this.getRewardName(rewardCurrency);
    logger.debug(`services.rewardDistributer.rewardName: ${rewardName}`);
    const createdRecord = await LicenseReward.create({
      rewardType: 'wallet',
      amount: rewardAmount,
      environmentType: config.brand,
      userId,
      rewardName,
    });
    logger.debug(
      `services.rewardDistributer.getRewardName.createdRecord._id: ${
        createdRecord._id
      }`,
    );
  }
}

const rewardDistributer = new RewardDistributer();
export default rewardDistributer;
