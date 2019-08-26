import EthWallet from './eth-wallet';
import { config, logger } from '../../common';
import { ethers, utils } from 'ethers';
import { ITransaction, ICoinMetadata, IWeb3TransferEvent } from '../../types';
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
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.estimateFee:${userApi.userId}`,
    );

    const gasPrice = await this.provider.getGasPrice();
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.estimateFee.gasPrice:${gasPrice.toHexString()}`,
    );
    try {
      const testValue = this.bigNumberify(10);
      const estimate = await this.contract.estimate.transfer(
        config.erc20FeeCalcAddress,
        testValue,
        { gasLimit: 750000 },
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.estimateFee.estimate:${estimate.toHexString()}`,
      );
      const total = this.toEther(estimate.mul(gasPrice));
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.estimateFee.total:${total}`,
      );
      return total;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.estimateFee.catch:${error}`,
      );
      return this.toEther(this.FALLBACK_GAS_VALUE.mul(gasPrice));
    }
  }

  private negate(numToNegate: string | utils.BigNumber) {
    try {
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.negate.numToNegate:${numToNegate.toString()}`,
      );
      if (typeof numToNegate === 'string') return `-${numToNegate}`;
      return this.bigNumberify(0).sub(numToNegate);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.Erc20Wallet.negate.catch:${error}`);
      throw error;
    }
  }

  private decimalize(numHexOrBn: string | number | utils.BigNumber): string {
    try {
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.decimalize.numHexOrBn:${numHexOrBn.toString()}`,
      );
      const parsedUnits = utils.formatUnits(
        numHexOrBn.toString(),
        this.decimalPlaces,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.decimalize.parsedUnits:${parsedUnits}`,
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.integerize.decimalizedString:${decimalizedString}`,
      );
      const integer = utils.parseUnits(
        decimalizedString.toString(),
        this.decimalPlaces,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.integerize.integer:${integer.toHexString()}`,
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getBalanceFromContract.ethAddress:${ethAddress}`,
      );
      const balance = await this.contract.balanceOf(ethAddress);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getBalanceFromContract.balance:${balance.toString()}`,
      );
      const decimalizedBalance = this.decimalize(balance);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getBalanceFromContract.decimalizedBalance:${decimalizedBalance}`,
      );
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getWalletInfo.userId:${
        userApi.userId
        }`,
      );
      const { ethAddress, blockNumAtCreation } = await this.getEthAddress(
        userApi,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getWalletInfo.ethAddress:${ethAddress}`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getWalletInfo.blocknumAtCreation:${blockNumAtCreation}`,
      );
      return {
        receiveAddress: ethAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
        blockNumAtCreation,
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
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.transferEventsToTransactions.transferEvents[length],currentBlockNumber,userAddress:${
      transferEvents.length
      },${currentBlockNumber},${userAddress}`,
    );

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
            to,
            from,
            type: isDeposit ? 'Deposit' : 'Withdrawal',
            amount: formattedAmount,
            total: formattedTotal,
          };
          logger.silly(
            `walletApi.coin-wallets.Erc20Wallet.transferEventsToTransactions.returnTransaction:${JSON.stringify(
              returnTransaction,
            )}`,
          );

          return returnTransaction;
        }),
    );
  }

  async getTransactions(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.address:${address}`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.blockNumAtCreation:${blockNumAtCreation}`,
      );
      // Ethers isn't quite there with getting past events. The new v5 release looks like serious improvements are coming.
      const web3 = new Web3(config.ethNodeUrl);
      const contract = new web3.eth.Contract(this.abi, this.contractAddress);

      const currentBlockNumber = await web3.eth.getBlockNumber();
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.currentBlockNumber:${currentBlockNumber}`,
      );
      const sent = await contract.getPastEvents('Transfer', {
        fromBlock: blockNumAtCreation,
        filter: {
          from: address,
        },
      });
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.sent.length:${
        sent.length
        }`,
      );
      const received = await contract.getPastEvents('Transfer', {
        fromBlock: blockNumAtCreation,
        filter: {
          to: address,
        },
      });
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.received.length:${
        received.length
        }`,
      );

      const transactions = await this.transferEventsToTransactions(
        [...sent, ...received],
        currentBlockNumber,
        address,
        web3,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getTransactions.transactions.length:${
        transactions.length
        }`,
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
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.getBalance.address:${address}`,
    );
    try {
      const balance = await this.getBalanceFromContract(address);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.getBalance.balance:${balance.toString()}`,
      );
      return {
        confirmed: balance.toString(),
        unconfirmed: '0',
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.userId: ${
        userApi.userId
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.address: ${address}`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.amount: ${amount}`,
      );
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.tokenBalance: ${tokenBalance}`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.parseEther(feeEstimate): ${parseEther(
          feeEstimate,
        ).toHexString()}`,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.etherBalance: ${etherBalance.toHexString()}`,
      );
      const hasEnoughEther = etherBalance.gt(parseEther(feeEstimate));
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.hasEnoughEther: ${hasEnoughEther}`,
      );
      const hasEnoughTokens = parseUnits(tokenBalance, this.decimalPlaces).gte(
        amount,
      );
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.requireEnoughTokensAndEtherToSend.hasEnoughTokens: ${hasEnoughTokens}`,
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

  async send(
    userApi: UserApi,
    to: string,
    value: string,
    walletPassword: string,
  ) {
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.send.userId: ${userApi.userId}`,
    );
    logger.debug(`walletApi.coin-wallets.Erc20Wallet.send.to: ${to}`);
    logger.debug(`walletApi.coin-wallets.Erc20Wallet.send.value: ${value}`);
    logger.debug(
      `walletApi.coin-wallets.Erc20Wallet.send.!!walletPassword: ${!!walletPassword}`,
    );
    try {
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      logger.debug(`walletApi.coin-wallets.Erc20Wallet.send.nonce: ${nonce}`);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.ethAddress: ${ethAddress}`,
      );
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.!!encryptedPrivateKey: ${!!encryptedPrivateKey}`,
      );
      const privateKey = this.decrypt(encryptedPrivateKey, walletPassword);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.!!privateKey: ${!!privateKey}`,
      );
      const amount = this.integerize(value);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.amount: ${amount.toHexString()}`,
      );
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
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.contract.address: ${
        contract.address
        }`,
      );
      const transaction = await contract.transfer(to, amount, { nonce });
      await userApi.incrementTxCount();
      this.ensureEthAddressMatchesPkey(wallet, ethAddress, userApi);
      logger.debug(
        `walletApi.coin-wallets.Erc20Wallet.send.transaction.hash: ${
        transaction.hash
        }`,
      );
      return {
        success: true,
        message: transaction.hash,
      };
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
        default: {
          throw error;
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
