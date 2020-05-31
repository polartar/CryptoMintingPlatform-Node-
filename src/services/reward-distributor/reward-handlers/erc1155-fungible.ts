import { utils } from 'ethers';
import { eSupportedInterfaces, IRewardAmounts } from '../../../types';
import { IUser } from '@blockbrothers/firebasebb/dist/src/types';
import { WalletReward } from '.';
import { UserWithReferrer } from '../../../utils';

export class Erc1155FungibleReward extends WalletReward {
  logPath = 'services.rewardDistributer.rewardHandlers.erc20Reward';
  tokenId: utils.BigNumber;

  constructor(
    rewardCurrency: string,
    amounts: IRewardAmounts,
    valueRequired?: number,
  ) {
    super(rewardCurrency, amounts, valueRequired);
    if (this.rewardConfig.walletApi !== eSupportedInterfaces.erc1155) {
      throw new Error(
        'Incorrect configuration provided for ERC1155FungibleReward',
      );
    }
    this.tokenId = utils.bigNumberify(this.rewardConfig.tokenId);
  }

  triggerReward = async (user: UserWithReferrer, value?: number) => {
    if (this.checkIfValueRequirementMet(value)) {
      if (this.amountToUser.gt(0)) {
        this.sendRewardToAccount(user.self, this.amountToUser);
      }
      if (this.amountToReferrer.gt(0)) {
        const referrer = await user.getReferrer();
        if (referrer) {
          this.sendRewardToAccount(referrer, this.amountToReferrer);
        }
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
    const tokenBalance = await this.contract.balanceOf(
      this.tokenId,
      this.rewardDistributerWallet.address,
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
