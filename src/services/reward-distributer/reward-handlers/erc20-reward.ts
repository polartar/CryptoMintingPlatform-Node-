import { ethers, utils } from 'ethers';
import { config, walletConfig } from '../../../common';
import { Logger } from '../../../common/logger';
import { RewardDistributerConfig } from '../../../models';

class Erc20Reward {
  provider: ethers.providers.JsonRpcProvider;
  rewardDistributerWallet: ethers.Wallet;
  contract: ethers.Contract;
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
    this.rewardDistributerWallet = new ethers.Wallet(
      config.erc20RewardDistributerPkey,
      this.provider,
    );
  }

  private getContract = (rewardCurrency: string, rewardAmount: number) => {
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
        amount: utils.parseUnits(
          rewardAmount.toString(),
          erc20Config.decimalPlaces,
        ),
      };
    } catch (error) {
      throw error;
    }
  };

  // TODO: Refactor for rocket chat
  // private checkErc20RewardWalletBalance = async (
  //   contract: ethers.Contract,
  //   rewardDistributerAddress: string,
  //   rewardCurrency: string,
  //   rewardAmount: ethers.utils.BigNumber,
  // ) => {
  //   const { erc20RewardWarnThreshold } = config;
  //   const estWeiPerTx = ethers.utils.bigNumberify(60000000000000);
  //   const [weiBalance, tokenBalance, decimals] = await Promise.all([
  //     this.provider.getBalance(rewardDistributerAddress),
  //     contract.balanceOf(rewardDistributerAddress),
  //     contract.decimals(),
  //   ]);
  //   const estTxsRemaining = weiBalance.div(estWeiPerTx);
  //   const lowOnWei = estTxsRemaining.lte(erc20RewardWarnThreshold);
  //   const estTokenTxsRemaining = tokenBalance.div(rewardAmount);
  //   const lowOnTokens = estTokenTxsRemaining.lte(erc20RewardWarnThreshold);
  //   if (lowOnWei) {
  //     // send tx to rocket chat
  //   }
  //   if (lowOnTokens) {
  //     slackService.postMessage(
  //       `Low on ${rewardCurrency}!\nSend ${rewardCurrency} to ${rewardDistributerAddress} ASAP!\nCurrent balance: ${utils.formatUnits(
  //         tokenBalance,
  //         decimals,
  //       )} ${rewardCurrency}.\nEstimated ${estTokenTxsRemaining.toString()} transactions until empty.
  //       `,
  //     );
  //   }
  // }

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
