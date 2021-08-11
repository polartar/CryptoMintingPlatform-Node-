import EthWallet from './eth-wallet';
import { config, logger } from '../../common';
import { ethers, utils, BigNumber, Overrides } from 'ethers';
import { ITransaction, ICoinMetadata, ISendOutput, ICartAddress, ICartBalance } from '../../types';
import { UserApi } from '../../data-sources';
import { transactionService } from '../../services';
import { ITokenBalanceTransactions } from '../../pipelines';
import { getNextWalletNumber } from '../../models';
import { build } from 'eth-url-parser';
import * as QRCode from 'qrcode';

class Erc20API extends EthWallet {
  contract: ethers.Contract;
  decimalPlaces: number;
  decimalFactor: BigNumber;
  decimalFactorNegative: BigNumber;
  provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl);
  abi: any;
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';
  FALLBACK_GAS_VALUE = this.bigNumberify(config.erc20GasValue);

  constructor(tokenMetadata: ICoinMetadata) {
    super(tokenMetadata);
    this.validateArguments(tokenMetadata);
    const { abi, contractAddress, decimalPlaces } = tokenMetadata;
    this.contract = new ethers.Contract(contractAddress, abi, this.provider);
    this.decimalPlaces = decimalPlaces;
    // this.decimalFactor = this.bigNumberify(10).pow(decimalPlaces);
    // this.decimalFactorNegative = this.bigNumberify(10).pow(
    //   this.bigNumberify(this.bigNumberify(0).sub(decimalPlaces)),
    // );
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

  public async getCartAddress(symbol: string, orderId: string, amount: string): Promise<ICartAddress> {
    const nextWalletNumber = await getNextWalletNumber(symbol);
    const accountLevel = config.cartEthDerivePath;
    const path = `m/44'/60'/0'/${accountLevel}/${nextWalletNumber}`;
    const mnemonic = config.getEthMnemonic(symbol);
    const { address } = ethers.Wallet.fromMnemonic(mnemonic, path);
    const qrCode = await QRCode.toDataURL(this.buildQrErc20Url(address, amount));

    const result: ICartAddress = {
      address,
      coinSymbol: symbol,
      qrCode
    }
    return result;
  }

  public async getCartBalance(symbol: string, orderId: string, address: string): Promise<ICartBalance> {
    const ethBalance = await this.getBalanceFromContract(address);
    const toReturn: ICartBalance = {
      address,
      coinSymbol: symbol,
      amountConfirmed: +ethBalance,
      amountUnconfirmed: +ethBalance,
      lastTransactions: [],
    };
    return toReturn;
  }

  private buildQrErc20Url(cartAddress: string, amount: string): string {
    if (!this.contractAddress) return undefined;
    const url = build({
      scheme: 'ethereum',
      prefix: 'pay',
      // eslint-disable-next-line
      target_address: this.contractAddress,
      parameters: {
        address: cartAddress,
        uint256: +amount * Math.pow(10, 8),
      },
      // eslint-disable-next-line
      function_name: 'transfer',
    });
    return url;
  }

  async estimateFee(userApi: UserApi) {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const ethBalance = await this.getEthBalance(userApi);
      const backupFeeEstimate = this.toEther(
        this.FALLBACK_GAS_VALUE.mul(gasPrice),
      );
      return {
        estimatedFee: backupFeeEstimate,
        feeCurrency: 'ETH',
        feeCurrencyBalance: ethBalance.confirmed,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.estimateFee.catch:${error}`,
      );
    }
  }

  private negate(numToNegate: string | BigNumber) {
    try {
      if (typeof numToNegate === 'string') return `-${numToNegate}`;
      return this.bigNumberify(0).sub(numToNegate);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.Erc20Wallet.negate.catch:${error}`);
      throw error;
    }
  }

  private decimalize(numHexOrBn: string | number | BigNumber): string {
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
      const integer = utils.parseUnits(decimalizedString, this.decimalPlaces);
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
    transferEvents: ethers.Event[],
    userAddress: string,
  ): Promise<ITransaction[]> {
    return Promise.all(
      transferEvents
        .sort(
          (eventOne, eventTwo) => eventTwo.blockNumber - eventOne.blockNumber,
        )
        .map(async event => {
          const {
            transactionHash,
            args,
            getTransaction,
            getTransactionReceipt,
            getBlock,
          } = event;
          const [
            { gasPrice, confirmations },
            { gasUsed },
            { timestamp },
          ] = await Promise.all([
            getTransaction(),
            getTransactionReceipt(),
            getBlock(),
          ]);
          const { tokens, to, from } = args;
          const amount = this.decimalize(tokens.toString());
          const fee = gasUsed.mul(gasPrice);
          const feeString = `${utils.formatEther(fee)} ETH`;
          const isDeposit = to === userAddress;
          const formattedAmount = isDeposit
            ? amount.toString()
            : this.negate(amount).toString();
          const formattedTotal = isDeposit
            ? `${formattedAmount}`
            : `${formattedAmount} ${this.symbol}, -${feeString}`;

          return {
            id: transactionHash,
            status: confirmations > 0 ? 'Complete' : 'Pending',
            timestamp,
            confirmations,
            fee: isDeposit ? '0' : feeString,
            link: `${config.ethTxLink}/${transactionHash}`,
            to: [to],
            from,
            type: isDeposit ? 'Deposit' : 'Withdrawal',
            amount: formattedAmount,
            total: formattedTotal,
          };
        }),
    );
  }

  private async formatWalletTransactions(
    walletTransactions: ITokenBalanceTransactions['transactions'],
    currentBlockNumber: number,
  ): Promise<ITransaction[]> {
    return Promise.all(
      walletTransactions.map(async transferEvent => {
        const { id, blockNumber, amount, fee, timestamp } = transferEvent;
        let total = amount;
        if (fee !== '0') {
          total = `${amount} ${this.symbol}, ${fee} ETH`;
        }

        return {
          ...transferEvent,
          id: id || `pending:${Date.now()}`,
          timestamp:
            timestamp > (Date.now() * 10) / 1000 ? timestamp / 1000 : timestamp,
          total,
          confirmations: blockNumber ? currentBlockNumber - blockNumber : 0,
          link: `${config.ethTxLink}/${id}`,
        };
      }),
    );
  }

  private getIndexedTransactions = async (address: string) => {
    try {
      const result = await transactionService.getGalaBalanceAndTransactions(
        address,
      );
      const currentBlock = await this.provider.getBlockNumber();
      const transactions = await this.formatWalletTransactions(
        result.transactions,
        currentBlock,
      );
      return transactions;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.Erc1155Wallet.getTransactions.catch:${error}`,
      );
      throw error;
    }
  };

  // private getIndexedBalance = async (address: string) => {
  //   const {
  //     confirmedBalance,
  //     pendingBalance,
  //   } = (await transactionService.getGalaBalanceAndTransactions(address)) as {
  //     confirmedBalance: number;
  //     pendingBalance: number;
  //   };
  //   return {
  //     confirmed: confirmedBalance.toString(),
  //     unconfirmed: pendingBalance.toString(),
  //   };
  // };

  async getTransactions(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    const { Transfer } = this.contract.filters;
    try {
      if (config.indexedTransactions) {
        return this.getIndexedTransactions(address);
      }
      const [sent, received] = await Promise.all([
        this.contract.queryFilter(Transfer(address), blockNumAtCreation),
        this.contract.queryFilter(Transfer(null, address), blockNumAtCreation),
      ]);

      const transactions = await this.transferEventsToTransactions(
        [...sent, ...received],
        address,
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
    const overrides: Overrides = {};
    try {
      const { ethNonceFromDb, ethAddress } = await this.getEthAddress(userApi);
      const privateKey = await this.getDecryptedPrivateKey(
        userApi.userId,
        walletPassword,
      );
      const amount = this.integerize(value);
      const wallet = new ethers.Wallet(privateKey, this.provider);

      await this.requireEnoughTokensAndEtherToSend(
        userApi,
        wallet.address,
        amount.toString(),
      );

      const contract = this.contract.connect(wallet);

      const [gasLimit, nonce, gasPrice] = await Promise.all([
        contract.estimateGas.transfer(to, amount),
        this.getNonce(userApi, ethAddress, ethNonceFromDb),
        this.provider.getGasPrice(),
      ]);
      overrides.gasLimit = gasLimit;
      overrides.gasPrice = gasPrice;
      overrides.nonce = nonce;

      const transaction = await contract.transfer(to, amount, overrides);
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
      logger.warn(
        `walletApi.coin-wallets.Erc20Wallet.send.catch: ${error.stack}`,
        { meta: { userId: userApi.userId, to, value, ...overrides } },
      );
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
