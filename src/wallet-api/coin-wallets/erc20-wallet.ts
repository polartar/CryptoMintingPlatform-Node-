import EthWallet from './eth-wallet';
import { config, logger } from '../../common';
import { ethers, utils } from 'ethers';
import {
  ITransaction,
  ICoinMetadata,
  IWeb3TransferEvent,
  ISendOutput,
} from '../../types';
import { UserApi } from '../../data-sources';
const Web3 = require('web3');

class Erc20API extends EthWallet {
  contract: ethers.Contract;
  decimalPlaces: number;
  decimalFactor: ethers.utils.BigNumber;
  decimalFactorNegative: ethers.utils.BigNumber;
  provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
  abi: any;
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';
  FALLBACK_GAS_VALUE = this.bigNumberify(36254);

  constructor(tokenMetadata: ICoinMetadata) {
    super(tokenMetadata);
    this.validateArguments(tokenMetadata);
    const { abi, contractAddress, decimalPlaces } = tokenMetadata;
    this.contract = new ethers.Contract(contractAddress, abi, this.provider);
    this.decimalPlaces = decimalPlaces;
    this.decimalFactor = this.bigNumberify(10).pow(decimalPlaces);
    this.decimalFactorNegative = this.bigNumberify(10).pow(
      this.bigNumberify(this.bigNumberify(0).sub(decimalPlaces)),
    );
  }

  private validateArguments({
    abi,
    decimalPlaces,
    contractAddress,
  }: ICoinMetadata) {
    if (!abi)
      throw new Error(
        'No abi provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!decimalPlaces || decimalPlaces < 0)
      throw new Error(
        'No decimalPlaces provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!contractAddress)
      throw new Error(
        'No contractAddress provided in token configuration for wallet interface. This parameter is required.',
      );
  }

  async estimateFee(userApi: UserApi) {
    const gasPrice = await this.provider.getGasPrice();
    const ethBalance = await this.getEthBalance(userApi);
    try {
      const testValue = this.bigNumberify(10);
      const estimate = await this.contract.estimate.transfer(
        config.erc20FeeCalcAddress,
        testValue,
        { gasLimit: 750000 },
      );
      const total = this.toEther(estimate.mul(gasPrice));
      const feeData = {
        estimatedFee: total,
        feeCurrency: 'ETH',
        feeCurrencyBalance: ethBalance,
      };
      return feeData;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.estimateFee.catch:${error}`,
      );
      const backupFeeEstimate = this.toEther(
        this.FALLBACK_GAS_VALUE.mul(gasPrice),
      );
      return {
        estimatedFee: backupFeeEstimate,
        feeCurrency: 'ETH',
        feeCurrencyBalance: ethBalance,
      };
    }
  }

  private negate(numToNegate: string | utils.BigNumber) {
    try {
      if (typeof numToNegate === 'string') return `-${numToNegate}`;
      return this.bigNumberify(0).sub(numToNegate);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.Erc20Wallet.negate.catch:${error}`);
      throw error;
    }
  }

  private decimalize(numHexOrBn: string | number | utils.BigNumber): string {
    try {
      const parsedUnits = utils.formatUnits(
        numHexOrBn.toString(),
        this.decimalPlaces,
      );
      return parsedUnits;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.decimalize.catch:${error}`,
      );
      throw error;
    }
  }

  private integerize(decimalizedString: string) {
    try {
      const integer = utils.parseUnits(
        decimalizedString.toString(),
        this.decimalPlaces,
      );
      return integer;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.integerize.catch:${error}`,
      );
      throw error;
    }
  }

  private async getBalanceFromContract(ethAddress: string) {
    try {
      const balance = await this.contract.balanceOf(ethAddress);
      const decimalizedBalance = this.decimalize(balance);
      return decimalizedBalance;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.getBalanceFromContract.catch:${error}`,
      );
      throw error;
    }
  }

  async getWalletInfo(userApi: UserApi) {
    try {
      const { ethAddress, blockNumAtCreation } = await this.getEthAddress(
        userApi,
      );
      return {
        contractAddress: this.contractAddress,
        receiveAddress: ethAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
        blockNumAtCreation,
        canSendFunds: true,
        lookupTransactionsBy: ethAddress,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.getWalletInfo.catch:${error}`,
      );
      throw error;
    }
  }

  private async transferEventsToTransactions(
    transferEvents: IWeb3TransferEvent[],
    currentBlockNumber: number,
    userAddress: string,
    web3: any,
  ): Promise<ITransaction[]> {
    return Promise.all(
      transferEvents
        .sort(
          (eventOne, eventTwo) => eventTwo.blockNumber - eventOne.blockNumber,
        )
        .map(async transferEvent => {
          const {
            transactionHash,
            blockNumber,
            blockHash,
            returnValues: { tokens, to, from },
          } = transferEvent;

          const amount = this.decimalize(tokens.toString());
          const block = await web3.eth.getBlock(blockNumber, false);
          const { timestamp } = block;
          const transaction = await web3.eth.getTransaction(transactionHash);
          const { gasPrice, gas } = transaction;
          const fee = this.bigNumberify(gas).mul(this.bigNumberify(gasPrice));
          const feeString = `${utils.formatEther(fee)} ETH`;
          const isDeposit = to === userAddress;
          const formattedAmount = isDeposit
            ? amount.toString()
            : this.negate(amount).toString();
          const formattedTotal = isDeposit
            ? `${formattedAmount}`
            : `${formattedAmount} ${this.symbol}, -${feeString}`;
          const returnTransaction = {
            id: transactionHash,
            status: blockHash ? 'Complete' : 'Pending',
            timestamp,
            confirmations: currentBlockNumber - blockNumber,
            fee: isDeposit ? '0' : feeString,
            link: `${config.ethTxLink}/${transactionHash}`,
            to: [to],
            from,
            type: isDeposit ? 'Deposit' : 'Withdrawal',
            amount: formattedAmount,
            total: formattedTotal,
          };

          return returnTransaction;
        }),
    );
  }

  async getTransactions(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      // Ethers isn't quite there with getting past events. The new v5 release looks like serious improvements are coming.
      const web3 = new Web3(config.ethNodeUrl);
      const contract = new web3.eth.Contract(this.abi, this.contractAddress);

      const currentBlockNumber = await web3.eth.getBlockNumber();
      const sent = await contract.getPastEvents('Transfer', {
        fromBlock: blockNumAtCreation,
        filter: {
          from: address,
        },
      });
      const received = await contract.getPastEvents('Transfer', {
        fromBlock: blockNumAtCreation,
        filter: {
          to: address,
        },
      });

      const transactions = await this.transferEventsToTransactions(
        [...sent, ...received],
        currentBlockNumber,
        address,
        web3,
      );
      return transactions;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  public async getBalance(address: string) {
    try {
      const balance = await this.getBalanceFromContract(address);
      return {
        confirmed: balance.toString(),
        unconfirmed: balance.toString(),
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.getBalance.catch:${error}`,
      );
      throw error;
    }
  }

  private async requireEnoughTokensAndEtherToSend(
    userApi: UserApi,
    address: string,
    amount: string,
  ) {
    try {
      const { parseEther, parseUnits } = utils;
      const [
        { confirmed: tokenBalance },
        feeEstimate,
        etherBalance,
      ] = await Promise.all([
        this.getBalance(address),
        this.estimateFee(userApi),
        this.provider.getBalance(address),
      ]);
      const hasEnoughEther = etherBalance.gt(
        parseEther(feeEstimate.estimatedFee),
      );
      const hasEnoughTokens = parseUnits(tokenBalance, this.decimalPlaces).gte(
        amount,
      );
      if (!hasEnoughTokens) {
        throw new Error(`Insufficient token balance`);
      }
      if (!hasEnoughEther) {
        throw new Error('Insufficient ETH balance');
      }
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.catch: ${error}`,
      );
      throw error;
    }
  }

  async send(userApi: UserApi, outputs: ISendOutput[], walletPassword: string) {
    const [{ to, amount: value }] = outputs;
    try {
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      const privateKey = this.decrypt(encryptedPrivateKey, walletPassword);
      const amount = this.integerize(value);
      const wallet = new ethers.Wallet(privateKey, this.provider);
      await this.requireEnoughTokensAndEtherToSend(
        userApi,
        wallet.address,
        amount.toString(),
      );
      const contract = new ethers.Contract(
        this.contractAddress,
        this.abi,
        wallet,
      );
      const transaction = await contract.transfer(to, amount, { nonce });
      await userApi.incrementTxCount();
      this.ensureEthAddressMatchesPkey(wallet, ethAddress, userApi);

      const response: {
        message: string;
        success: boolean;
        transaction: ITransaction;
      } = {
        message: null,
        success: true,
        transaction: {
          amount: `-${value}`,
          confirmations: 0,
          fee: 'TBD',
          from: transaction.from,
          to: [transaction.to],
          id: transaction.hash,
          link: `${config.ethTxLink}/${transaction.hash}`,
          status: 'Pending',
          timestamp: Math.floor(Date.now() / 1000),
          type: 'Withdrawal',
          total: value + ' + pending fee',
        },
      };
      return response;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.Erc20Wallet.send.catch: ${error}`);
      let message;
      switch (error.message) {
        case 'Insufficient ETH balance': {
          message = error.message;
          break;
        }
        case 'Insufficient token balance': {
          message = `Insufficient ${this.symbol} balance`;
          break;
        }
        case 'Incorrect password': {
          message = error.message;
          break;
        }
        default: {
          if (error.reason === 'underflow occurred') {
            message = `Invalid ${this.symbol} value`;
          } else {
            throw error;
          }
        }
      }
      return {
        success: false,
        message,
      };
    }
  }
}

export default Erc20API;
