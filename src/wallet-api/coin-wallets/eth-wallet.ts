import { credentialService, transactionService } from '../../services';
import CoinWalletBase from './coin-wallet-base';
import { ethers, providers, utils, BigNumber } from 'ethers';

import { config, logger } from '../../common';
import {
  ITransaction,
  ICoinMetadata,
  ISendOutput,
  ICartAddress,
  ICartBalance,
} from '../../types';
import { UserApi } from '../../data-sources';
import { IEthBalanceTransactions } from '../../pipelines';
import { getNextWalletNumber } from '../../models';
import * as QRCode from 'qrcode';

const PRIVATEKEY = 'privatekey';

class EthWallet extends CoinWalletBase {
  provider = new providers.JsonRpcProvider(config.ethNodeUrl);
  etherscan = new providers.EtherscanProvider(
    config.etherscanNetwork,
    config.etherScanApiKey,
  );

  constructor({
    name,
    symbol,
    contractAddress,
    abi,
    backgroundColor,
    icon,
  }: ICoinMetadata) {
    super(name, symbol, contractAddress, abi, backgroundColor, icon);
  }

  public async checkIfWalletExists(userApi: UserApi) {
    try {
      const privateKey = await credentialService.get(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
        true,
      );
      return !!privateKey;
    } catch (error) {
      return false;
    }
  }

  public async getCartAddress(
    symbol: string,
    orderId: string,
    amount: string,
  ): Promise<ICartAddress> {
    const toReturn: ICartAddress = {
      address: '',
      coinSymbol: symbol,
      qrCode: '',
    };
    try {
      const nextWalletNumber = await getNextWalletNumber(symbol);
      const accountLevel = config.cartEthDerivePath;
      const path = `m/44'/60'/0'/${accountLevel}/${nextWalletNumber}`;
      const mnemonic = config.getEthMnemonic(symbol);
      const { address } = ethers.Wallet.fromMnemonic(mnemonic, path);
      toReturn.address = address;
    } catch (err) {
      console.log(`failed getCartAddress for eth-wallet - ETH ${orderId}`, err);
      toReturn.address = '0xD7394c6fdA30BFbFf25D148E29F0951c4fcc0098';
    }
    try {
      const qrCode = await QRCode.toDataURL(
        this.buildEthQrUrl(toReturn.address, amount),
      );
      toReturn.qrCode = qrCode;
      console.log(toReturn);
    } catch (err) {
      console.log(`failed getCartAddress for eth-wallet - QR ${orderId}`, err);
    }

    return toReturn;
  }

  public async getCartBalance(symbol: string, orderId: string, address: string): Promise<ICartBalance> {
    const toReturn: ICartBalance = {
      address,
      coinSymbol: symbol,
      amountConfirmed: 0,
      amountUnconfirmed: 0,
      lastTransactions: [],
    };

    try{
      const ethBalance = await this.getBalanceNonIndexed(address);

      toReturn.amountConfirmed = +ethBalance.confirmed;
      toReturn.amountUnconfirmed = +ethBalance.unconfirmed;
    }
    catch(err) {
      logger.error(`coin-wallets.eth-wallet-getCartBalance : ${symbol}/${orderId}/${address}/${JSON.stringify(toReturn)}`);
    }    

    return toReturn;
  }

  private buildEthQrUrl(cartAddress: string, amount: string): string {
    // const url = build({
    //   scheme: 'ethereum',
    //   prefix: 'pay',
    //   // eslint-disable-next-line
    //   target_address: cartAddress,
    //   parameters: {
    //     value: +amount * Math.pow(10, 18),
    //   },
    // });
    const url = 'blah';
    return url;
  }

  public async createWallet(
    userApi: UserApi,
    walletPassword: string,
    mnemonic: string,
  ) {
    try {
      const { privateKey, address } = ethers.Wallet.fromMnemonic(mnemonic);
      const encryptedPrivateKey = this.encrypt(privateKey, walletPassword);
      const privateKeyPromise = this.savePrivateKey(
        userApi.userId,
        encryptedPrivateKey,
      );
      const addressSavePromise = this.saveAddress(userApi, address);

      await Promise.all([privateKeyPromise, addressSavePromise]);
      return true;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.createWallet.catch:${error}`,
      );
      return false;
    }
  }

  private async saveAddress(userApi: UserApi, ethAddress: string) {
    try {
      const ethBlockNumAtCreation = await this.provider.getBlockNumber();
      const updateResult = await userApi.setWalletAccountToUser(
        ethAddress,
        ethBlockNumAtCreation,
      );
      return updateResult;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.saveAddress.catch:${error}`,
      );
      throw error;
    }
  }

  protected async savePrivateKey(userId: string, encryptedPrivateKey: string) {
    const result = await credentialService.create(
      userId,
      'ETH',
      PRIVATEKEY,
      encryptedPrivateKey,
    );

    return result.data === 'OK';
  }

  protected async getDecryptedPrivateKey(userId: string, secret: string) {
    try {
      const privateKey = await credentialService.get(userId, 'ETH', PRIVATEKEY);
      const decryptedPrivateKey = this.decrypt(privateKey, secret);
      if (decryptedPrivateKey.reEncryptedString) {
        await this.savePrivateKey(
          userId,
          decryptedPrivateKey.reEncryptedString,
        );
      }
      return decryptedPrivateKey.decryptedString;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getDecryptedPrivateKey.catch:${error} | userId${userId}`,
      );
      throw error;
    }
  }

  public async estimateFee(userApi: UserApi) {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const feeEstimate = gasPrice.mul(21001);
      const feeInEther = this.toEther(feeEstimate);

      const ethBalance = await this.getEthBalance(userApi);

      const feeData = {
        estimatedFee: feeInEther,
        feeCurrency: 'ETH',
        feeCurrencyBalance: ethBalance.confirmed,
      };
      return feeData;
    } catch (error) {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.catch: ${error}`,
      );
      throw error;
    }
  }

  public async getWalletInfo(userApi: UserApi) {
    try {
      const { ethAddress } = await this.getEthAddress(userApi);
      return {
        receiveAddress: ethAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
        canSendFunds: true,
        lookupTransactionsBy: ethAddress,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getWalletInfo.catch: ${error}`,
      );
      throw error;
    }
  }

  async getBalance(address: string) {
    return this.getBalanceNonIndexed(address);
  }

  protected async getEthBalance(userApi: UserApi) {
    try {
      const { ethAddress } = await this.getEthAddress(userApi);

      return this.getBalanceNonIndexed(ethAddress);
    } catch (error) {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getEthBalance.catch: ${error}`,
      );
      throw error;
    }
  }

  private async getBalanceNonIndexed(address: string) {
    const balance = await this.provider.getBalance(address);
    const ethBalance = ethers.utils.formatEther(balance);

    return {
      unconfirmed: ethBalance,
      confirmed: ethBalance,
    };
  }

  private async requireEnoughBalanceToSendEther(
    address: string,
    amount: BigNumber,
  ) {
    try {
      const { parseEther } = utils;
      const { confirmed } = await this.getBalance(address);
      const weiConfirmed = parseEther(confirmed);
      const hasEnough = weiConfirmed.gte(amount);

      if (!hasEnough) throw new Error(`Insufficient account balance`);
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.requireEnoughBalanceToSendEther.catch:${error}`,
      );
      throw error;
    }
  }

  protected async getNonce(
    userApi: UserApi,
    ethAddress?: string,
    ethNonceFromDb?: number,
  ) {
    let nonce = ethNonceFromDb;
    let userEthAddress = ethAddress;
    try {
      if (!nonce || !userEthAddress) {
        const userFromDb = await userApi.findFromDb();
        const {
          wallet = {
            ethAddress: '',
            ethNonce: 0,
          },
        } = userFromDb;
        nonce = wallet.ethNonce;
        userEthAddress = wallet.ethAddress;
      }
      const txCount = await this.provider.getTransactionCount(userEthAddress);
      if (txCount > nonce) {
        await userApi.update({ $set: { 'wallet.ethNonce': txCount } });
        return txCount;
      }
      return nonce;
    } catch (error) {
      logger.warn(`eth-wallet.getNonce.catch: ${error}`);
      throw error;
    }
  }

  protected checkIfSendingToSelf = (from: string, to: string) => {
    if (from.toLowerCase() === to.toLowerCase()) {
      throw new Error('Cannot send to yourself');
    }
  };

  protected async getEthAddress(userApi: UserApi) {
    try {
      const {
        wallet = {
          ethAddress: '',
          ethNonce: 0,
          ethBlockNumAtCreation: 2426642,
        },
      } = await userApi.findFromDb();
      /* tslint:disable: prefer-const */
      const {
        ethAddress,
        ethNonce: ethNonceFromDb,
        ethBlockNumAtCreation: blockNumAtCreation,
      } = wallet;

      if (!ethAddress) {
        throw new Error('Wallet not found');
      }
      return { ethAddress, ethNonceFromDb, blockNumAtCreation };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getEthAddress.catch:${error}`,
      );
      throw error;
    }
  }

  private async getTransactionsIndexed(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      const currentBlockNumber = await this.provider.getBlockNumber();
      const result = await transactionService.getEthBalanceAndTransactions(
        address,
      );
      const formattedTransactions = this.formatTransactions(
        result.transactions,
        currentBlockNumber,
      );
      return formattedTransactions;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  private formatTransactionsNonIndexed(
    transactions: ethers.providers.TransactionResponse[],
    address: string,
  ): ITransaction[] {
    try {
      const gasUsed = this.bigNumberify(2100);
      return transactions.map(rawTx => {
        const {
          hash,
          blockNumber,
          confirmations,
          timestamp,
          to,
          from,
          value,
        } = rawTx;
        const gasPrice = this.bigNumberify(rawTx.gasPrice);
        const subTotal = this.bigNumberify(value);
        const fee = gasUsed.mul(gasPrice);
        const isDeposit = to.toLowerCase() === address.toLowerCase();
        const total = subTotal.add(isDeposit ? 0 : fee);
        const returnTx = {
          id: hash,
          status: blockNumber !== null ? 'Complete' : 'Pending',
          confirmations: +confirmations,
          timestamp: +timestamp,
          fee: isDeposit ? '0' : this.toEther(fee, true),
          link: `${config.ethTxLink}/${hash}`,
          to: [to],
          from: from,
          type: isDeposit ? 'Deposit' : 'Withdrawal',
          amount: isDeposit
            ? this.toEther(subTotal)
            : this.toEther(subTotal, true),
          total: isDeposit ? this.toEther(total) : this.toEther(total, true),
        };
        return returnTx;
      });
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.formatTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  async getTransactions(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    if (config.indexedTransactions) {
      return this.getTransactionsIndexed(address, blockNumAtCreation);
    }
    return this.getTransactionsNonIndexed(address, blockNumAtCreation);
  }

  private async getTransactionsNonIndexed(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      const transactions = await this.etherscan.getHistory(
        address,
        blockNumAtCreation,
      );
      const formattedTransactions = this.formatTransactionsNonIndexed(
        transactions.filter(tx => {
          return !tx.value.isZero();
        }),
        address,
      );
      return formattedTransactions;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getTransactions.catch:${error}`,
      );
      return [];
    }
  }

  protected bigNumberify(anyValidValue: any) {
    return BigNumber.from(anyValidValue);
  }

  protected ensureEthAddressMatchesPkey(
    userWallet: ethers.Wallet,
    addressFromDb: string,
    userApi: UserApi,
  ) {
    return new Promise<void>((resolve, reject) => {
      const { address } = userWallet;
      if (address.toLowerCase() === addressFromDb.toLowerCase()){
        resolve();
      } 
      else {
        userApi.Model.findByIdAndUpdate(
          userApi.userId,
          { $set: { 'wallet.ethAddress': address } },
          err => {
            if (err) reject(err);
            else {
              resolve();
            }
          },
        );
      }
    });
  }
  protected async requireValidAddress(maybeAddress: string) {
    try {
      const isAddress = !!(await this.provider.resolveName(maybeAddress));
      if (!isAddress) throw new Error(`Invalid address ${maybeAddress}`);
    } catch (error) {
      throw error;
    }
  }

  async send(userApi: UserApi, outputs: ISendOutput[], walletPassword: string) {
    const [{ to, amount }] = outputs;

    try {
      this.requireValidAddress(to);
      const value = utils.parseEther(amount);
      const { ethAddress, ethNonceFromDb } = await this.getEthAddress(userApi);
      this.checkIfSendingToSelf(ethAddress, to);
      const nonce = await this.getNonce(userApi, ethAddress, ethNonceFromDb);
      await this.requireEnoughBalanceToSendEther(ethAddress, value);
      const privateKey = await this.getDecryptedPrivateKey(
        userApi.userId,
        walletPassword,
      );
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const transaction = await wallet.sendTransaction({
        nonce,
        to,
        value,
        gasLimit: 21001,
      });
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
          amount: this.toEther(transaction.value, true),
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
      logger.warn(`walletApi.coin-wallets.EthWallet.send.catch: ${error}`);
      let message;
      switch (error.message) {
        case 'Cannot send to yourself':
        case 'Incorrect password': {
          message = error.message;
          break;
        }
        case 'Insufficient account balance': {
          message = 'Insufficient ETH balance';
          break;
        }
        default: {
          switch (error.reason) {
            case 'underflow occurred': {
              message = 'Invalid ETH value';
              break;
            }
            case 'insufficient funds': {
              message = 'Insufficient account balance';
              break;
            }
            default: {
              throw error;
            }
          }
        }
      }
      return {
        success: false,
        message: message,
      };
    }
  }

  protected toEther(wei: BigNumber, negate: boolean = false): string {
    try {
      const inEther = utils.formatEther(wei);
      return `${negate ? '-' : ''}${inEther}`;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.EthWallet.toEther.catch:${error}`);
      throw error;
    }
  }

  protected toWei(ether: string): BigNumber {
    try {
      const amount = utils.parseEther(ether);
      return amount;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.EthWallet.toWei.catch:${error}`);
      const { value } = error;
      throw new Error(`Invalid amount: ${value}`);
    }
  }

  private formatTransactions(
    transactions: IEthBalanceTransactions['transactions'],
    currentBlockNumber: number,
  ): ITransaction[] {
    try {
      return transactions.map(rawTx => {
        const { id, blockNumber, to } = rawTx;

        const returnTx = {
          ...rawTx,
          confirmations: currentBlockNumber - blockNumber,
          link: `${config.ethTxLink}/${id}`,
          to: [to],
        };
        return returnTx;
      });
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.formatTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  public async recoverWallet(
    userApi: UserApi,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      const privateKey = await this.getDecryptedPrivateKey(
        userApi.userId,
        oldPassword,
      );
      const reEncryptedPrivateKey = this.encrypt(privateKey, newPassword);
      const response = await this.savePrivateKey(
        userApi.userId,
        reEncryptedPrivateKey,
      );

      return response;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.recoverWallet.catch:${error}`,
      );
      throw error;
    }
  }

  public checkPassword = async (userApi: UserApi, password: string) => {
    try {
      const decryptedPrivateKey = await this.getDecryptedPrivateKey(
        userApi.userId,
        password,
      );

      return !!decryptedPrivateKey;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.checkPassword.catch:${error}`,
      );
      return false;
    }
  };

  public signTransaction = async (
    userApi: UserApi,
    outputs: ISendOutput[],
    walletPassword: string,
  ) => {
    const [{ to, amount }] = outputs;

    this.requireValidAddress(to);
    const value = utils.parseEther(amount);

    const { ethAddress, ethNonceFromDb } = await this.getEthAddress(userApi);
    this.checkIfSendingToSelf(ethAddress, to);

    const nonce = await this.getNonce(userApi, ethAddress, ethNonceFromDb);
    await this.requireEnoughBalanceToSendEther(ethAddress, value);

    const gasPrice = await this.provider.getGasPrice();
    const { chainId } = await this.provider.getNetwork();

    const privateKey = await this.getDecryptedPrivateKey(
      userApi.userId,
      walletPassword,
    );

    const wallet = new ethers.Wallet(privateKey, this.provider);

    const transaction = await wallet.signTransaction({
      to,
      gasLimit: 21000,
      value,
      gasPrice,
      nonce,
      chainId,
    });

    await userApi.incrementTxCount();
    this.ensureEthAddressMatchesPkey(wallet, ethAddress, userApi);

    const { hash } = ethers.utils.parseTransaction(transaction);

    return { hash, transaction };
  };

  public sendSignedTransaction = async (transaction: string) => {
    const response = await this.provider.sendTransaction(transaction);

    return response;
  };
}

export default EthWallet;
