import autoBind = require('auto-bind');
import { IShareConfig } from '../types';
import { LicenseReward, RewardDistributerConfig } from '../models';
import { config, logger, walletConfig } from '../common';
import { ethers } from 'ethers';

class RewardDistributer {
  provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
  rewardDistributerWallet = new ethers.Wallet(
    config.erc20RewardDistributerPkey,
    this.provider,
  );
  contract: ethers.Contract;
  constructor() {
    autoBind(this);
  }

  private getContract(rewardCurrency: string, rewardAmount: number) {
    try {
      logger.debug(
        `services.rewardDistributer.getContract.rewardCurrency: ${rewardCurrency}`,
      );
      logger.debug(
        `services.rewardDistributer.getContract.rewardAmount: ${rewardAmount}`,
      );
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
      logger.warn(`services.rewardDistributer.getContract.catch: ${error}`);
      throw error;
    }
  }

  private getRewardName(currency: string) {
    logger.debug(
      `services.rewardDistributer.getRewardName.currency: ${currency}`,
    );
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
    logger.debug(
      `services.rewardDistributer.getRewardName.currency, selectedReward: ${currency}, ${selectedReward}`,
    );
    return selectedReward;
  }

  private async saveDocReward(
    rewardCurrency: string,
    rewardAmount: number,
    userId: string,
  ) {
    const rewardName = this.getRewardName(rewardCurrency);
    logger.debug(`services.rewardDistributer.rewardName: ${rewardName}`);
    const createdRecord = await LicenseReward.create({
      rewardType: 'wallet',
      amount: rewardAmount,
      environmentType: config.brand,
      userId,
      rewardName,
    });
    logger.debug(
      `services.rewardDistributer.getRewardName.createdRecord.id: ${
        createdRecord.id
      }`,
    );
    return createdRecord.id;
  }

  private async sendErc20(
    rewardCurrency: string,
    rewardAmount: number,
    ethAddress: string,
  ) {
    logger.debug(
      `services.rewardDistributer.sendErc20.rewardCurrency: ${rewardCurrency}`,
    );
    logger.debug(
      `services.rewardDistributer.sendErc20.rewardAmount: ${rewardAmount}`,
    );
    logger.debug(
      `services.rewardDistributer.sendErc20.ethAddress: ${ethAddress}`,
    );
    if (!ethAddress)
      throw new Error(`User ethAddress required to send ${rewardCurrency}`);
    const { contract, amount } = this.getContract(rewardCurrency, rewardAmount);
    logger.debug(
      `services.rewardDistributer.sendErc20.contract.address: ${
        contract.address
      }`,
    );
    logger.debug(`services.rewardDistributer.sendErc20.amount: ${amount}`);
    const walletAddress = this.rewardDistributerWallet.address;
    logger.debug(
      `services.rewardDistributer.sendErc20.walletAddress: ${walletAddress}`,
    );
    const { nonce } = await RewardDistributerConfig.findOne({ walletAddress });
    logger.debug(`services.rewardDistributer.sendErc20.nonce: ${nonce}`);
    const transaction = await contract.transfer(ethAddress, amount, { nonce });
    logger.debug(
      `services.rewardDistributer.sendErc20.transaction.hash: ${
        transaction.hash
      }`,
    );
    RewardDistributerConfig.findOneAndUpdate(
      { walletAddress },
      {
        $inc: { nonce: 1 },
      },
    );
    return transaction.hash;
  }

  public async sendReward(
    rewardConfig: IShareConfig,
    userId: string,
    ethAddress: string,
  ) {
    logger.debug(`services.rewardDistributer.userId: ${userId}`);
    const { rewardAmount, rewardCurrency } = rewardConfig;
    logger.debug(`services.rewardDistributer.rewardAmount: ${rewardAmount}`);
    logger.debug(
      `services.rewardDistributer.rewardCurrency: ${rewardCurrency}`,
    );
    let id;
    switch (rewardCurrency.toLowerCase()) {
      case 'green': {
        id = await this.sendErc20(rewardCurrency, rewardAmount, ethAddress);
        break;
      }
      default: {
        id = await this.saveDocReward(rewardCurrency, rewardAmount, userId);
        break;
      }
    }
    logger.debug(`services.rewardDistributer.id: ${id}`);
    return id;
  }
}

const rewardDistributer = new RewardDistributer();
export default rewardDistributer;
