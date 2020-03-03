import { Logger } from '../../common/logger';
import { erc20Reward, docReward, gameItemsReward } from './reward-handlers';
import { LootBoxOrder } from '../../models';

class RewardDistributer {
  public sendReward = async (
    rewardAmount: number,
    rewardCurrency: string,
    userId: string,
    ethAddress: string,
    numLootBoxes: number,
    logger: Logger,
  ) => {
    const methodLogger = logger.setMethod('sendReward');
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
        gameItemsReward.sendRandom(userId, ethAddress, numLootBoxes),
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
