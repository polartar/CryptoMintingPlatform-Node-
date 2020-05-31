import { utils } from 'ethers';
import {
  eSupportedInterfaces,
  ItemTokenName,
  IRewardAmounts,
} from '../../../types';
import { IUser } from '@blockbrothers/firebasebb/dist/src/types';
import { ItemReward } from '.';
import { WalletTransaction } from '../../../models';
import {
  availableRewardTokensPipeline,
  ITokenIdsAvailable,
  availableRewardTokenSupplyPipeline,
  IRewardTokenSupply,
} from '../../../pipelines';
import { UserWithReferrer } from '../../../utils';

export class Erc1155NFTReward extends ItemReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc20Reward';
  tokenId: utils.BigNumber;

  constructor(
    itemName: ItemTokenName,
    amounts: IRewardAmounts,
    requiredValue?: number,
  ) {
    super(itemName, amounts, requiredValue);
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

  triggerReward = async (user: UserWithReferrer, value?: number) => {
    if (this.checkIfValueRequirementMet(value)) {
      if (this.amountToUser.gt(0)) {
        this.sendRewardToAccount(user.self, this.amountToUser);
      }
      if (this.amountToReferrer.gt(0)) {
        const referrer = await user.getReferrer();
        this.sendRewardToAccount(referrer, this.amountToReferrer);
      }
    }
  };

  private sendRewardToAccount = async (
    user: IUser,
    amount: utils.BigNumber,
  ) => {
    const ethAddress = user?.wallet?.ethAddress;
    try {
      if (!ethAddress)
        throw new Error(
          `User ethAddress required to send ${this.rewardConfig.name}`,
        );
      const nonce = await this.getNextNonce();
      const tokenId = this.getNextTokenId();
      if (!tokenId) {
        this.alertService.postMessage(
          `WARN: no token found to send to user.\n
          userId: ${user.id}\n
          tokenName: ${this.rewardConfig.name}\n
          baseId: ${this.rewardConfig.tokenId}\n`,
        );
      }
      this.logger.debug('contractAddress', this.contract.address);
      this.logger.debug('amount', amount.toString());
      this.logger.debug('nonce', nonce.toString());
      const data = await this.contract.interface.functions.safeTransferFrom.encode(
        [
          this.rewardDistributerWallet.address,
          ethAddress,
          this.tokenId,
          amount,
          '0x0',
        ],
      );
      const transaction = await this.sendContractTransaction(
        data,
        250000,
        'Gala',
        user.id,
      );

      transaction
        .wait(1)
        .then(({ transactionHash }) => {
          this.logger.debug('receiptTxhash', transactionHash);
          this.checkRewardThresholdAndAlert();
          this.checkGasThresholdAndAlert();
        })
        .catch((error: Error) => {
          this.logger.warn('error', error.toString());
        });
      const { hash } = transaction;
      this.logger.debug('hash', hash);

      return hash;
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
