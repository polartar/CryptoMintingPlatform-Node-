import { providers, utils, Contract, Wallet, constants } from 'ethers';
import {
  ICoinMetadata,
  IRewardTriggerValues,
  IRewardTriggerConfig,
  IUser,
} from '../../../types';
import {
  RewardDistributerConfig,
  IRewardAudit,
  RewardAudit,
} from '../../../models';
import { bigNumberify } from 'ethers/utils';
import { nodeSelector, transactionService } from '../..';
import { UserHelper } from '../../../utils';
import { config, logger, AlertService } from '../../../common';
import { IWalletReferralCountAggregate } from '../../../pipelines';

export abstract class BaseReward {
  protected rewardWarnThreshold = bigNumberify(config.rewardWarnThreshold);
  protected amountToUser: utils.BigNumber;
  protected amountToReferrer: utils.BigNumber;
  protected rewardConfig: ICoinMetadata;
  protected contract: Contract;
  protected rewardDistributerWallet: Wallet;
  protected logPath: string;
  protected ethProvider = new providers.JsonRpcProvider(config.ethNodeUrl);
  protected alertService = new AlertService(
    config.isStage ? 'wallet-monitoring-stage' : 'wallet-monitoring',
  );
  protected rewardDistributerWalletEthBalance: utils.BigNumber;
  protected chainId = config.cryptoNetwork.toLowerCase().includes('main')
    ? 1
    : 3;
  protected requiredValues: IRewardTriggerValues;
  protected totalAmountPerAction: utils.BigNumber;

  constructor(
    rewardConfig: ICoinMetadata,
    triggerConfig: IRewardTriggerConfig,
  ) {
    const { decimalPlaces } = rewardConfig;
    const { valuesRequired, amount } = triggerConfig;
    this.ethProvider;
    this.rewardConfig = rewardConfig;
    this.requiredValues = {
      referrer: valuesRequired?.referrer || 0,
      user: valuesRequired?.user || 0,
    };

    if (amount.toUser > 0) {
      this.amountToUser =
        decimalPlaces > 0
          ? utils.parseUnits(
              amount.toUser.toString(),
              this.rewardConfig.decimalPlaces,
            )
          : constants.One;
    } else {
      this.amountToUser = constants.Zero;
    }
    if (amount.toReferrer > 0) {
      this.amountToReferrer =
        decimalPlaces > 0
          ? utils.parseUnits(
              amount.toReferrer.toString(),
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
    info: (key: string, value: string) => {
      logger.info(`${this.logPath}.${key}: ${value}`);
    },
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

  protected checkIfUserValueRequirementMet = (value: number) => {
    return value >= this.requiredValues.user;
  };

  protected checkIfReferrerValueRequirementMet = (value: number) => {
    return value >= this.requiredValues.referrer;
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

  triggerReward = async (
    user: UserHelper,
    triggerValues: IRewardTriggerValues = {},
  ) => {
    if (
      this.amountToUser.gt(0) &&
      this.checkIfUserValueRequirementMet(triggerValues.user || 0)
    ) {
      this.sendRewardToUser(user.self, this.amountToUser, triggerValues.user);
    }
    if (
      this.amountToReferrer.gt(0) &&
      this.checkIfReferrerValueRequirementMet(triggerValues.referrer || 0)
    ) {
      const referrer = await user.getReferrer();
      if (referrer) {
        this.sendRewardToReferrer(
          referrer,
          this.amountToReferrer,
          triggerValues.referrer,
        );
      }
    }
  };

  abstract sendRewardToAccount: (
    userId: string,
    ethAddress: string,
    amount: utils.BigNumber,
    valueSent: number,
  ) => Promise<void>;

  protected sendRewardToReferrer = async (
    user: IWalletReferralCountAggregate,
    amount: utils.BigNumber,
    valueSent?: number,
  ) => {
    return this.sendRewardToAccount(
      user.id,
      user.ethAddress,
      amount,
      valueSent,
    );
  };

  protected sendRewardToUser = async (
    user: IUser,
    amount: utils.BigNumber,
    valueSent: number,
  ) => {
    return this.sendRewardToAccount(
      user.id,
      user?.wallet?.ethAddress,
      amount,
      valueSent,
    );
  };

  protected saveRewardAudit = (audit: IRewardAudit) => {
    return RewardAudit.create({
      rewardWalletAddress: this.rewardDistributerWallet.address,
      contractAddress: this.contract.address,
      rewardName: this.rewardConfig.name,
      decimalPlaces: this.rewardConfig.decimalPlaces,
      amountToReferrer: this.amountToReferrer.toString(),
      amountToUser: this.amountToUser.toString(),
      ...audit,
    });
  };
}
