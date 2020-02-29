import { Logger } from '../../common/logger';
import { erc20Reward, docReward, gameItemsReward } from './reward-handlers';

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
      const tokenId =
        '0x8000000000000000000000000000001e00000000000000000000000000000000';
      const [resultRewardId, resultItemsRewarded] = await Promise.all([
        docReward.send(rewardCurrency, rewardAmount, userId, logger),
        gameItemsReward.sendRandom(userId, ethAddress, numLootBoxes),
        gameItemsReward.sendItemByTokenId(userId, ethAddress, tokenId),
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
