import { utils } from 'ethers';
import {
  eSupportedInterfaces,
  ItemTokenName,
  IRewardTriggerConfig,
} from '../../../types';
import { ItemReward } from '.';
import { WalletTransaction } from '../../../models';
import {
  availableRewardTokensPipeline,
  ITokenIdsAvailable,
  availableRewardTokenSupplyPipeline,
  IRewardTokenSupply,
} from '../../../pipelines';
import { gameItemService } from '../../../services';

export class Erc1155NFTReward extends ItemReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc20Reward';
  tokenId: utils.BigNumber;

  constructor(
    itemName: ItemTokenName,
    rewardTriggerConfig: IRewardTriggerConfig,
  ) {
    super(itemName, rewardTriggerConfig);
    if (this.rewardConfig.walletApi !== eSupportedInterfaces.erc1155) {
      throw new Error('Incorrect configuration provided for ERC1155NFTReward');
    }
    this.tokenId = utils.bigNumberify(this.rewardConfig.tokenId);
  }

  getNextTokenId = async () => {
    const tokenIdsFromIndexer = (await WalletTransaction.aggregate(
      availableRewardTokensPipeline(
        this.rewardDistributerWallet.address,
        this.rewardConfig.tokenId,
      ),
    )) as ITokenIdsAvailable[];
    for (const availableToken of tokenIdsFromIndexer) {
      const token = utils.bigNumberify(availableToken.tokenId);
      const owner = await this.contract.ownerOf(token);
      if (owner === this.rewardDistributerWallet.address) {
        return token;
      } else {
        this.alertService.postMessage(
          `WARN: ${availableToken.tokenId} identified for reward, but not owned by reward distributer`,
        );
      }
    }
  };

  sendRewardToAccount = async (
    userId: string,
    ethAddress: string,
    amount: utils.BigNumber,
  ) => {
    try {
      if (!ethAddress)
        throw new Error(
          `User ethAddress required to send ${this.rewardConfig.name}`,
        );

      await gameItemService.assignItemToUserByTokenId(
        userId,
        ethAddress,
        this.tokenId.toString(),
        amount.toNumber(),
      );
    } catch (error) {
      this.logger.warn('error', error.toString());
      throw error;
    }
  };

  checkRewardThresholdAndAlert = async () => {
    const [
      result = { supplyRemaining: 0 },
    ] = (await WalletTransaction.aggregate(
      availableRewardTokenSupplyPipeline(
        this.rewardDistributerWallet.address,
        this.rewardConfig.tokenId,
      ),
    )) as IRewardTokenSupply[];
    if (result.supplyRemaining <= this.supplyWarnThreshold) {
      this.sendBalanceAlert(
        result.supplyRemaining.toString(),
        result.supplyRemaining.toString(),
        this.rewardConfig.name,
      );
      return true;
    }
    return false;
  };
}
