import { utils } from 'ethers';
import { eSupportedInterfaces, IRewardTriggerConfig } from '../../../types';
import { WalletReward } from '.';
import { IRewardAudit } from '../../../models';

export class Erc1155FungibleReward extends WalletReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc1155Fungible';
  tokenId: utils.BigNumber;

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
        userId,
      );
      audit.txHash = transaction.hash;
      this.saveRewardAudit(audit);
      transaction
        .wait(1)
        .then(({ transactionHash }) => {
          this.logger.debug('receiptTxhash', transactionHash);
          this.checkRewardThresholdAndAlert();
          this.checkGasThresholdAndAlert();
        })
        .catch((error: Error) => {
          this.logger.warn('transaction.catch', error.toString());
        });
      const { hash } = transaction;
      this.logger.debug('hash', hash);
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
