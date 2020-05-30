import { providers, utils, Contract, Wallet } from 'ethers';
import {
  config,
  coinSymbolToCoinConfig,
  logger,
  AlertService,
} from '../../../common';
import { ICoinMetadata } from '../../../types';
import { IUser } from '@blockbrothers/firebasebb/dist/src/types';
import { RewardDistributerConfig } from '../../../models';
import { bigNumberify } from 'ethers/utils';
import nodeSelector from '../../node-selector';

export abstract class BaseReward {
  rewardWarnThreshold = bigNumberify(config.rewardWarnThreshold);
  amount: utils.BigNumber;
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

  constructor(rewardCurrency: string, amount: string) {
    this.rewardConfig = coinSymbolToCoinConfig.get(
      rewardCurrency.toLowerCase(),
    );
    this.amount =
      this.rewardConfig.decimalPlaces > 0
        ? utils.parseUnits(amount, this.rewardConfig.decimalPlaces)
        : utils.bigNumberify(1);
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
      `Low on ${symbol}!\nSend ${symbol} to ${
        this.rewardDistributerWallet.address
      } ASAP!\nCurrent balance: ${utils.formatEther(
        currentBalance,
      )} ${symbol}.\nEstimated ${txsRemaining} transactions until empty.`,
    );
  };

  protected sendContractTransaction = async (
    data: string,
    gasLimit = 250000,
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
    const { hash } = utils.parseTransaction(transaction);
    await nodeSelector.assignNodeToMineTransaction(hash);
    const txResponse = await this.ethProvider.sendTransaction(transaction);

    return txResponse;
  };
  abstract checkRewardThresholdAndAlert: () => Promise<boolean>;
  abstract triggerReward: (user: IUser) => Promise<string>;
}
