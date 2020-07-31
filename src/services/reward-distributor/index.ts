import { Logger } from '../../common/logger';
import { erc20Reward, docReward } from './reward-handlers';

class RewardDistributer {
  public sendReward = async (
    rewardAmount: number,
    rewardCurrency: string,
    userId: string,
    ethAddress: string,
    logger: Logger,
  ) => {
    const methodLogger = logger.setMethod('sendReward');
    methodLogger.JSON.debug({ rewardAmount, rewardCurrency });
    const rewardCurrencyLowered = rewardCurrency.toLowerCase();
    let rewardId: string;
    const itemsRewarded: string[] = [];
    if (rewardCurrencyLowered === 'green') {
      rewardId = await erc20Reward.send(
        rewardCurrency,
        rewardAmount,
        ethAddress,
        logger,
      );
    } else if (rewardCurrencyLowered === 'gala') {
      const [resultRewardId] = await Promise.all([
        docReward.send(rewardCurrency, rewardAmount, userId, logger),
      ]);
      rewardId = resultRewardId;
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
