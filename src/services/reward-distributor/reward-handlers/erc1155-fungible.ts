import { utils, BigNumber } from 'ethers';
import { eSupportedInterfaces, IRewardTriggerConfig } from '../../../types';
import { WalletReward } from '.';
import { IRewardAudit } from '../../../models';
import { gameItemService } from '../../../services';
import { logDebug } from '../../../common';

export class Erc1155FungibleReward extends WalletReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc1155Fungible';
  tokenId: BigNumber;

  constructor(
    rewardCurrency: string,
    rewardTriggerConfig: IRewardTriggerConfig,
  ) {
    super(rewardCurrency, rewardTriggerConfig);
    if (this.rewardConfig.walletApi !== eSupportedInterfaces.erc1155) {
      throw new Error(
        'Incorrect configuration provided for ERC1155FungibleReward',
      );
    }
    this.tokenId = BigNumber.from(this.rewardConfig.tokenId);
  }

  sendRewardToAccount = async (
    userId: string,
    ethAddress: string,
    amount: BigNumber,
    valueSent: number,
  ) => {
    const audit: IRewardAudit = {
      amountSent: amount.toString(),
      rewardType: 'ERC1155-Fungible',
      userEthAddress: ethAddress,
      userId: userId,
      valueSent,
    };
    try {
      if (!ethAddress)
        throw new Error(
          `User ethAddress required to send ${this.rewardConfig.name}`,
        );

      this.logger.debug('contractAddress', this.contract.address);
      this.logger.debug('amount', amount.toString());
      this.logger.info(
        'fungibleReward',
        `${[
          this.rewardConfig.name,
          this.rewardConfig.tokenId.toString(),
          userId,
          ethAddress,
          amount.toString(),
        ].join(', ')}`,
      );

      try {
        const [result] = await gameItemService.assignItemToUserByTokenId(
          userId,
          ethAddress,
          this.tokenId.toHexString(),
          amount.toNumber(),
        );
        logDebug('sendRewardToAccount', 'gameItemService', 'after');
        logDebug('sendRewardToAccount', 'txHash', audit.txHash);
        audit.txHash = result;
        this.saveRewardAudit(audit);
      } catch (error) {
        logDebug('sendRewardToAccount', 'error', error.stack);
        this.logger.warn('sendRewardToAccount.catch', error.stack);
      }
    } catch (error) {
      this.logger.warn('sendRewardToAccount.catch', error.toString());
      this.saveRewardAudit({ ...audit, error: error.stack });
      throw error;
    }
  };

  checkRewardThresholdAndAlert = async () => {
    const tokenBalance = await this.contract.balanceOf(
      this.rewardDistributerWallet.address,
      this.tokenId,
    );
    const estTokenTxsRemaining = tokenBalance.div(this.totalAmountPerAction);
    const lowOnTokens = estTokenTxsRemaining.lte(this.rewardWarnThreshold);
    if (lowOnTokens) {
      this.sendBalanceAlert(
        utils.formatUnits(tokenBalance, this.rewardConfig.decimalPlaces),
        estTokenTxsRemaining.toString(),
        this.rewardConfig.symbol,
      );
      return true;
    }
    return false;
  };
}
