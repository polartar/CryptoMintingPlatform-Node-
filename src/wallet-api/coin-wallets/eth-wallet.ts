import { credentialService } from '../../services';
import CoinWalletBase from './coin-wallet-base';
import { ethers, providers, utils } from 'ethers';
import { config, logger } from '../../common';
import { ITransaction, ICoinMetadata, ISendOutput } from '../../types';
import { UserApi } from '../../data-sources';

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
      const privateKey = await this.getPrivateKey(userApi.userId);
      return !!privateKey;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.checkIfWalletExists.catch:${error}`,
      );
      return false;
    }
  }

  public async createWallet(
    userApi: UserApi,
    walletPassword: string,
    mnemonic: string,
  ) {
    try {
      const { privateKey, address } = ethers.Wallet.fromMnemonic(mnemonic);
      const encryptedPrivateKey = this.encrypt(privateKey, walletPassword);
      const privateKeyPromise = credentialService.create(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
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

  protected async getPrivateKey(userId: string) {
    try {
      const privateKey = await credentialService.get(userId, 'ETH', PRIVATEKEY);
      return privateKey;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getPrivateKey.catch:${error}`,
      );
      throw error;
    }
  }

  protected async getEthBalance(userApi: UserApi) {
    try {
      const { ethAddress } = await this.getEthAddress(userApi);
      const balance = await this.provider.getBalance(ethAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getEthBalance.catch: ${error}`,
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
        feeCurrencyBalance: ethBalance,
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
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getWalletInfo.catch: ${error}`,
      );
      throw error;
    }
  }

  async getBalance(address: string) {
    try {
      const balance = await this.provider.getBalance(address);
      const balanceInEther = this.toEther(balance);
      return {
        unconfirmed: balanceInEther,
        confirmed: balanceInEther,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getBalance.catch: ${error}`,
      );
      throw error;
    }
  }

  private async requireEnoughBalanceToSendEther(
    address: string,
    amount: utils.BigNumber,
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
        ethNonce: nonce,
        ethBlockNumAtCreation: blockNumAtCreation,
      } = wallet;

      if (!ethAddress) {
        throw new Error('Wallet not found');
      }
      return { ethAddress, nonce, blockNumAtCreation };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getEthAddress.catch:${error}`,
      );
      throw error;
    }
  }

  async getTransactions(
    address: string,
    blockNumAtCreation: number,
  ): Promise<ITransaction[]> {
    try {
      const transactions = await this.etherscan.getHistory(
        address,
        blockNumAtCreation,
      );
      const formattedTransactions = this.formatTransactions(
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
      throw error;
    }
  }

  protected bigNumberify(anyValidValue: any) {
    return ethers.utils.bigNumberify(anyValidValue);
  }

  protected ensureEthAddressMatchesPkey(
    userWallet: ethers.Wallet,
    addressFromDb: string,
    userApi: UserApi,
  ) {
    return new Promise((resolve, reject) => {
      const { address } = userWallet;
      if (address.toLowerCase() === addressFromDb.toLowerCase()) resolve();
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
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      await this.requireEnoughBalanceToSendEther(ethAddress, value);
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      const privateKey = this.decrypt(encryptedPrivateKey, walletPassword);
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
        case 'Incorrect password': {
          message = 'Incorrect password';
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

  protected toEther(wei: utils.BigNumber, negate: boolean = false): string {
    try {
      const inEther = utils.formatEther(wei);
      return `${negate ? '-' : ''}${inEther}`;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.EthWallet.toEther.catch:${error}`);
      throw error;
    }
  }

  protected toWei(ether: string): utils.BigNumber {
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

  public async recoverWallet(
    userApi: UserApi,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      const privateKey = this.decrypt(encryptedPrivateKey, oldPassword);
      const reEncryptedPrivateKey = this.encrypt(privateKey, newPassword);
      const response = await credentialService.create(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
        reEncryptedPrivateKey,
      );
      return response && response.status === 200;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.recoverWallet.catch:${error}`,
      );
      throw error;
    }
  }
}

export default EthWallet;
