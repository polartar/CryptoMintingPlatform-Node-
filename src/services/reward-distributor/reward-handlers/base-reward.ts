import { providers, utils, Contract, Wallet, constants } from 'ethers';
import { ICoinMetadata, IRewardAmounts } from '../../../types';
import { RewardDistributerConfig } from '../../../models';
import { bigNumberify } from 'ethers/utils';
import { nodeSelector, transactionService } from '../..';
import { UserWithReferrer } from '../../../utils';
import { config, logger, AlertService } from '../../../common';

export abstract class BaseReward {
  rewardWarnThreshold = bigNumberify(config.rewardWarnThreshold);
  amountToUser: utils.BigNumber;
  amountToReferrer: utils.BigNumber;
  rewardConfig: ICoinMetadata;
  contract: Contract;
  rewardDistributerWallet: Wallet;
  logPath: string;
  ethProvider = new providers.JsonRpcProvider(config.ethNodeUrl);
  alertService = new AlertService(
    config.isStage ? 'wallet-monitoring-stage' : 'wallet-monitoring',
  );
  rewardDistributerWalletEthBalance: utils.BigNumber;
  chainId = utils.getNetwork(this.ethProvider.network).chainId;
  requiredValue: number;
  totalAmountPerAction: utils.BigNumber;

  constructor(
    rewardConfig: ICoinMetadata,
    amounts: IRewardAmounts,
    requiredValue?: number,
  ) {
    this.rewardConfig = rewardConfig;
    this.requiredValue = requiredValue;
    const { decimalPlaces } = rewardConfig;

    if (amounts.amountToUser) {
      this.amountToUser =
        decimalPlaces > 0
          ? utils.parseUnits(
              amounts.amountToUser,
              this.rewardConfig.decimalPlaces,
            )
          : constants.One;
    } else {
      this.amountToUser = constants.Zero;
    }
    if (amounts.amountToReferrer) {
      this.amountToReferrer =
        decimalPlaces > 0
          ? utils.parseUnits(
              amounts.amountToUser,
              this.rewardConfig.decimalPlaces,
            )
          : constants.One;
    } else {
      this.amountToReferrer = constants.Zero;
    }

    this.totalAmountPerAction = this.amountToUser.add(this.amountToReferrer);
    this.rewardDistributerWallet = new Wallet(
      config.rewardDistributerPkey,
      this.ethProvider,
    );
    if (this.rewardConfig.abi && this.rewardConfig.contractAddress) {
      this.contract = new Contract(
        this.rewardConfig.contractAddress,
        this.rewardConfig.abi,
        this.rewardDistributerWallet,
      );
    }
    this.ethProvider.getBalance(this.rewardDistributerWallet.address);
  }

  logger = {
    debug: (key: string, value: string) => {
      logger.debug(`${this.logPath}.${key}: ${value}`);
    },
    warn: (key: string, value: string) => {
      logger.warn(`${this.logPath}.${key}: ${value}`);
    },
  };

  getNextNonce = async () => {
    const senderAddress = this.rewardDistributerWallet.address;
    const distrubuterConfig = await RewardDistributerConfig.findOneAndUpdate(
      { walletAddress: senderAddress },
      {
        $inc: { nonce: 1 },
      },
    );
    if (!distrubuterConfig) {
      throw new Error(
        `Distributer config not found for walletAddress: ${senderAddress}`,
      );
    }
    const { nonce } = distrubuterConfig;

    return nonce;
  };

  protected checkGasThresholdAndAlert = async () => {
    const estWeiPerTx = utils.bigNumberify(60000000000000);
    const balance = await this.ethProvider.getBalance(
      this.rewardDistributerWallet.address,
    );
    const estTxsRemaining = balance.div(estWeiPerTx);
    if (estTxsRemaining.lt(this.rewardWarnThreshold)) {
      this.sendBalanceAlert(
        utils.formatEther(balance),
        estTxsRemaining.toString(),
        'ETH for gas',
      );
    }
  };

  protected sendBalanceAlert = (
    currentBalance: string,
    txsRemaining: string,
    symbol: string,
  ) => {
    this.alertService.postMessage(
      `Low on ${symbol}!\nSend ${symbol} to ${this.rewardDistributerWallet.address} ASAP!\nCurrent balance: ${currentBalance} ${symbol}.\nEstimated ${txsRemaining} transactions until empty.`,
    );
  };

  protected checkIfValueRequirementMet = (value: number) => {
    return this.requiredValue && value >= this.requiredValue;
  };

  protected sendContractTransaction = async (
    data: string,
    gasLimit = 250000,
    fromUserId: string,
    toUserId?: string,
  ) => {
    const [nonce, gasPrice] = await Promise.all([
      this.getNextNonce(),
      this.ethProvider.getGasPrice(),
    ]);
    const transaction = await this.rewardDistributerWallet.sign({
      to: this.contract.address,
      data,
      gasLimit,
      value: '0x0',
      nonce,
      gasPrice,
      chainId: this.chainId,
    });
    const parsedTx = utils.parseTransaction(transaction);
    await nodeSelector.assignNodeToMineTransaction(parsedTx.hash);
    const txResponse = await this.ethProvider.sendTransaction(transaction);
    await transactionService.savePendingErc1155Transaction(
      txResponse,
      fromUserId,
      toUserId,
    );
    return txResponse;
  };
  abstract checkRewardThresholdAndAlert: () => Promise<boolean>;
  abstract triggerReward: (
    user: UserWithReferrer,
    value?: number,
  ) => Promise<void>;
}
