import { IShareConfig } from '../../types';
import { Logger } from '../../common/logger';
import { erc20Reward, docReward, gameItemsReward } from './reward-handlers';

class RewardDistributer {
  public sendReward = async (
    rewardConfig: IShareConfig,
    userId: string,
    ethAddress: string,
    logger: Logger,
  ) => {
    const methodLogger = logger.setMethod('sendReward');
    const { rewardAmount, rewardCurrency } = rewardConfig;
    methodLogger.JSON.debug({ rewardAmount, rewardCurrency });
    const rewardCurrencyLowered = rewardCurrency.toLowerCase();
    let rewardId: string;
    let itemsRewarded: string[] = [];
    if (rewardCurrencyLowered === 'green') {
      rewardId = await erc20Reward.send(
        rewardCurrency,
        rewardAmount,
        ethAddress,
        logger,
      );
    } else if (rewardCurrencyLowered === 'arcade') {
      const [resultRewardId, resultItemsRewarded] = await Promise.all([
        docReward.send(rewardCurrency, rewardAmount, userId, logger),
        gameItemsReward.send(userId, ethAddress, 1),
      ]);
      rewardId = resultRewardId;
      itemsRewarded = resultItemsRewarded;
    } else {
      rewardId = await docReward.send(
        rewardCurrency,
        rewardAmount,
        userId,
        logger,
      );
    }
    const rewardResult = {
      rewardId,
      amountRewarded: rewardAmount,
      itemsRewarded,
    };
    methodLogger.JSON.debug(rewardResult);
    return rewardResult;
  };
}

const rewardDistributer = new RewardDistributer();
export default rewardDistributer;
