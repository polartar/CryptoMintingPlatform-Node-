import { ethers, utils } from 'ethers';
import { eSupportedInterfaces } from '../../../types';
import { IUser } from '@blockbrothers/firebasebb/dist/src/types';
import { BaseReward } from './base-reward';

export class Erc1155FungibleReward extends BaseReward {
  rewardDistributerWallet: ethers.Wallet;
  contract: ethers.Contract;
  logPath = 'services.rewardDistributer.rewardHandlers.erc20Reward';
  tokenId: utils.BigNumber;

  constructor(rewardCurrency: string, amount: string) {
    super(rewardCurrency, amount);
    if (this.rewardConfig.walletApi !== eSupportedInterfaces.erc1155) {
      throw new Error('Incorrect configuration provided for Erc20Reward');
    }
    this.tokenId = utils.bigNumberify(this.rewardConfig.tokenId);
  }

  public triggerReward = async (user: IUser) => {
    const ethAddress = user?.wallet?.ethAddress;
    try {
      if (!ethAddress)
        throw new Error(
          `User ethAddress required to send ${this.rewardConfig.name}`,
        );
      const nonce = await this.getNextNonce();
      this.logger.debug('contractAddress', this.contract.address);
      this.logger.debug('amount', this.amount.toString());
      this.logger.debug('nonce', nonce.toString());
      const data = await this.contract.interface.functions.safeTransferFrom.encode(
        [
          this.rewardDistributerWallet.address,
          ethAddress,
          this.amount,
          this.tokenId,
          this.amount,
          '0x0',
        ],
      );
      const transaction = await this.sendContractTransaction(data);

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
    const tokenBalance = await this.contract.balanceOf(
      this.tokenId,
      this.rewardDistributerWallet.address,
    );
    const estTokenTxsRemaining = tokenBalance.div(this.amount);
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
