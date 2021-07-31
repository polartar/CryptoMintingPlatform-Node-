import { ethers, utils } from 'ethers';
import { config, walletConfigurations } from '../../../common';
import { Logger } from '../../../common/logger';
import { RewardDistributerConfig } from '../../../models';

class Erc20Reward {
  rewardDistributerWallet: ethers.Wallet;
  contract: ethers.Contract;
  provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);

  constructor() {
    this.rewardDistributerWallet = new ethers.Wallet(
      config.rewardDistributerPkey,
      this.provider,
    );
  }

  private getContract = (rewardCurrency: string, rewardAmount: number) => {
    try {
      const erc20Config = walletConfigurations.find(
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
        amount: utils.parseUnits(
          rewardAmount.toString(),
          erc20Config.decimalPlaces,
        ),
      };
    } catch (error) {
      throw error;
    }
  };

  //Sends rewards from central reward wallet, to user for action on site
  public send = async (
    rewardCurrency: string,
    rewardAmount: number,
    ethAddress: string,
    logger: Logger,
  ) => {
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
      logger.obj.debug({ walletAddress });
      const distrubuterConfig = await RewardDistributerConfig.findOneAndUpdate(
        { walletAddress },
        {
          $inc: { nonce: 1 },
        },
      );
      if (!distrubuterConfig) {
        throw new Error(
          `Distributer config not found for walletAddress: ${walletAddress}`,
        );
      }
      const { nonce } = distrubuterConfig;
      logger.obj.debug({
        contractAddress,
        amount: amount.toString(),
        nonce,
      });
      const transaction = await contract.transfer(ethAddress, amount, {
        nonce,
      });
      transaction
        .wait(1)
        .then(
          ({
            transactionHash: receiptTxHash,
          }: ethers.providers.TransactionReceipt) => {
            logger.obj.debug({ receiptTxHash });
          },
        )
        .catch((error: Error) => {
          logger.obj.warn({ error: error.toString() });
        });
      const { hash } = transaction;
      logger.obj.debug({ hash });

      return hash;
    } catch (error) {
      logger.obj.warn({ error });
      throw error;
    }
  };
}

export const erc20Reward = new Erc20Reward();
