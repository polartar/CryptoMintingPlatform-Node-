import autoBind = require('auto-bind');
import { IShareConfig } from '../types';
import { PromotionalReward, RewardDistributerConfig } from '../models';
import { config, walletConfig } from '../common';
import { ethers } from 'ethers';
import { Logger } from '../common/logger';

class RewardDistributer {
  provider: ethers.providers.JsonRpcProvider;
  rewardDistributerWallet: ethers.Wallet;
  contract: ethers.Contract;
  constructor() {
    autoBind(this);
    this.provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
    this.rewardDistributerWallet = new ethers.Wallet(
      config.erc20RewardDistributerPkey,
      this.provider,
    );
  }

  private getContract(rewardCurrency: string, rewardAmount: number) {
    try {
      const erc20Config = walletConfig.find(
        coin => coin.symbol.toLowerCase() === rewardCurrency.toLowerCase(),
      );
      if (!erc20Config)
        throw new Error(
          `${rewardCurrency} not supported for erc20 reward distribution.`,
        );
      return {
        contract: new ethers.Contract(
          erc20Config.contractAddress,
          erc20Config.abi,
          this.rewardDistributerWallet,
        ),
        amount: ethers.utils.parseUnits(
          rewardAmount.toString(),
          erc20Config.decimalPlaces,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  private getRewardName(currency: string) {
    let selectedReward;
    switch (currency.toLowerCase()) {
      case 'winx': {
        selectedReward = 'WinX';
        break;
      }
      case 'green': {
        selectedReward = 'GREEN';
        break;
      }
      case 'smart': {
        selectedReward = 'Smart';
        break;
      }
      case 'arcade': {
        selectedReward = 'Arc';
        break;
      }
      case 'arc': {
        selectedReward = 'Arc';
        break;
      }
      default: {
        throw new Error(`No reward name for currency ${currency}`);
      }
    }
    return selectedReward;
  }

  private async saveDocReward(
    rewardCurrency: string,
    rewardAmount: number,
    userId: string,
    logger: Logger,
  ) {
    const rewardName = this.getRewardName(rewardCurrency);
    logger.obj.debug({ rewardName });
    const { id: createdRecordId } = await PromotionalReward.create({
      rewardType: 'wallet',
      amount: rewardAmount,
      environmentType: config.brand,
      userId,
      rewardName,
    });
    logger.obj.debug({ createdRecordId });
    return createdRecordId;
  }

  private async sendErc20(
    rewardCurrency: string,
    rewardAmount: number,
    ethAddress: string,
    logger: Logger,
  ) {
    try {
      logger.JSON.debug({ rewardCurrency, rewardAmount, ethAddress });
      if (!ethAddress)
        throw new Error(`User ethAddress required to send ${rewardCurrency}`);
      const { contract, amount } = this.getContract(
        rewardCurrency,
        rewardAmount,
      );
      const { address: contractAddress } = contract;
      const walletAddress = this.rewardDistributerWallet.address;
      const distrubuterConfig = await RewardDistributerConfig.findOne({
        walletAddress,
      });
      if (!distrubuterConfig) {
        throw new Error(
          `Distributer config not found for walletAddress: ${walletAddress}`,
        );
      }
      const { nonce } = distrubuterConfig;
      logger.obj.debug({
        contractAddress,
        amount: amount.toString(),
        walletAddress,
        nonce,
      });
      const transaction = await contract.transfer(ethAddress, amount, {
        nonce,
      });
      const { hash } = transaction;
      logger.obj.debug({ hash });
      RewardDistributerConfig.findOneAndUpdate(
        { walletAddress },
        {
          $inc: { nonce: 1 },
        },
      );
      return transaction.hash;
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  }

  public async sendReward(
    rewardConfig: IShareConfig,
    userId: string,
    ethAddress: string,
    logger: Logger,
  ) {
    const methodLogger = logger.setMethod('sendReward');
    const { rewardAmount, rewardCurrency } = rewardConfig;
    methodLogger.JSON.debug({ rewardAmount, rewardCurrency });
    let actionId;
    switch (rewardCurrency.toLowerCase()) {
      case 'green': {
        actionId = await this.sendErc20(
          rewardCurrency,
          rewardAmount,
          ethAddress,
          logger,
        );
        break;
      }
      default: {
        actionId = await this.saveDocReward(
          rewardCurrency,
          rewardAmount,
          userId,
          logger,
        );
        break;
      }
    }
    methodLogger.obj.debug({ actionId });
    return actionId;
  }
}

const rewardDistributer = new RewardDistributer();
export default rewardDistributer;
