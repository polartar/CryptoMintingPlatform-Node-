import { utils } from 'ethers';
import {
  eSupportedInterfaces,
  ItemTokenName,
  IRewardTriggerConfig,
} from '../../../types';
import { ItemReward } from '.';
import { WalletTransaction, IRewardAudit } from '../../../models';
import {
  availableRewardTokenSupplyPipeline,
  IRewardTokenSupply,
} from '../../../pipelines';
import { gameItemService } from '../../../services';
import { logger } from 'handlebars';

export class Erc1155NFTReward extends ItemReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc1155-nft';
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

  sendRewardToAccount = async (
    userId: string,
    ethAddress: string,
    amount: utils.BigNumber,
    valueSent: number,
  ) => {
    const audit: IRewardAudit = {
      amountSent: amount.toString(),
      rewardType: 'ERC1155-NFT',
      userEthAddress: ethAddress,
      userId: userId,
      valueSent,
      txHash: '',
      error: '',
    };
    try {
      if (!ethAddress)
        throw new Error(
          `User ethAddress required to send ${this.rewardConfig.name}`,
        );
      this.logger.info(
        'nftReward',
        `${[
          this.rewardConfig.name,
          this.rewardConfig.tokenId.toString(),
          userId,
          ethAddress,
          amount.toString(),
        ].join(', ')}`,
      );

      try {
        const [
          result,
        ] = await gameItemService.assignItemToUserByTokenIdLimitOne(
          userId,
          ethAddress,
          [this.tokenId.toHexString()],
        );
        audit.txHash = result;
        this.saveRewardAudit(audit);
      } catch (error) {
        this.logger.warn('sendRewardToAccount.catch', error.stack);
      }
    } catch (error) {
      this.logger.warn('sendRewardToAccount.catch', error.toString());
      this.saveRewardAudit({ ...audit, error: error.stack });
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
