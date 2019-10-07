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
    logger.debug(
      `walletApi.coin-wallets.EthWallet.checkIfWalletExists.userId:${
        userApi.userId
      }`,
    );
    try {
      const privateKey = await this.getPrivateKey(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.checkIfWalletExists.address:${!!privateKey}`,
      );
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
    logger.debug(
      `walletApi.coin-wallets.EthWallet.createWallet.!!walletPassword:${!!walletPassword}`,
    );
    logger.debug(
      `walletApi.coin-wallets.EthWallet.createWallet.!!mnemonic:${!!mnemonic}`,
    );
    logger.debug(
      `walletApi.coin-wallets.EthWallet.createWallet.userApi.userId:${
        userApi.userId
      }`,
    );
    try {
      const { privateKey, address } = ethers.Wallet.fromMnemonic(mnemonic);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.createWallet.!!privateKey:${!!privateKey}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.createWallet.address:${address}`,
      );
      const encryptedPrivateKey = this.encrypt(privateKey, walletPassword);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.createWallet.!!encryptedPrivateKey:${!!encryptedPrivateKey}`,
      );
      const privateKeyPromise = credentialService.create(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
        encryptedPrivateKey,
      );

      const addressSavePromise = this.saveAddress(userApi, address);

      const [privateKeyResponse, addressSaveResponse] = await Promise.all([
        privateKeyPromise,
        addressSavePromise,
      ]);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.createWallet.privateKeyResponse:${
          privateKeyResponse.status
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.createWallet.!!addressSaveResponse:${!!addressSaveResponse}`,
      );

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
      logger.debug(
        `walletApi.coin-wallets.EthWallet.saveAddress.userId:${userApi.userId}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.saveAddress.ethAddress:${ethAddress}`,
      );
      const ethBlockNumAtCreation = await this.provider.getBlockNumber();
      logger.debug(
        `walletApi.coin-wallets.EthWallet.saveAddress.ethBlockNumAtCreation:${ethBlockNumAtCreation}`,
      );
      const updateResult = await userApi.setWalletAccountToUser(
        ethAddress,
        ethBlockNumAtCreation,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.saveAddress.updateResult:${!!updateResult}`,
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
    logger.debug(
      `walletApi.coin-wallets.EthWallet.getPrivateKey.userId:${userId}`,
    );
    try {
      const privateKey = await credentialService.get(userId, 'ETH', PRIVATEKEY);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getPrivateKey.userId:${!!privateKey}`,
      );
      return privateKey;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getPrivateKey.catch:${error}`,
      );
      throw error;
    }
  }

  protected async getEthBalance(userApi: UserApi) {
    const { ethAddress } = await this.getEthAddress(userApi);
    const balance = await this.provider.getBalance(ethAddress);
    return ethers.utils.formatEther(balance);
  }

  public async estimateFee(userApi: UserApi) {
    try {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.userId:${userApi.userId}`,
      );
      const gasPrice = await this.provider.getGasPrice();
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.gasPrice:${gasPrice.toHexString()}`,
      );
      const feeEstimate = gasPrice.mul(21001);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.gasPrice:${feeEstimate.toHexString()}`,
      );
      const feeInEther = this.toEther(feeEstimate);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.feeInEther:${feeInEther}`,
      );

      const ethBalance = await this.getEthBalance(userApi);

      const feeData = {
        estimatedFee: feeInEther,
        feeCurrency: 'ETH',
        feeCurrencyBalance: ethBalance,
      };
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.feeData:${JSON.stringify(
          feeData,
        )}`,
      );
      return feeData;
    } catch (error) {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.estimateFee.catch:${error}`,
      );
      throw error;
    }
  }

  public async getWalletInfo(userApi: UserApi) {
    try {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getWalletInfo.userId:${
          userApi.userId
        }`,
      );
      const { ethAddress } = await this.getEthAddress(userApi);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getWalletInfo.ethAddress:${ethAddress}`,
      );
      return {
        receiveAddress: ethAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.getWalletInfo.catch:${error}`,
      );
      throw error;
    }
  }

  async getBalance(address: string) {
    logger.debug(
      `walletApi.coin-wallets.EthWallet.getBalance.address:${address}`,
    );
    try {
      const balance = await this.provider.getBalance(address);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.balance:${balance.toHexString()}`,
      );
      const balanceInEther = this.toEther(balance);
      return {
        unconfirmed: balanceInEther,
        confirmed: balanceInEther,
      };
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.EthWallet.getBalance.catch:${error}`);
      throw error;
    }
  }

  private async requireEnoughBalanceToSendEther(
    address: string,
    amount: utils.BigNumber,
  ) {
    try {
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.address:${address}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.amount:${amount.toHexString()}`,
      );
      const { parseEther } = utils;
      const { confirmed } = await this.getBalance(address);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.confirmed:${confirmed}`,
      );
      const weiConfirmed = parseEther(confirmed);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.weiConfirmed:${weiConfirmed.toHexString()}`,
      );
      const hasEnough = weiConfirmed.gte(amount);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getBalance.hasEnough:${hasEnough}`,
      );

      if (!hasEnough) throw new Error(`Insufficient account balance`);
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.requireEnoughBalanceToSendEther.catch:${error}`,
      );
      throw error;
    }
  }

  protected async getEthAddress(userApi: UserApi) {
    logger.debug(
      `walletApi.coin-wallets.EthWallet.getEthAddress.userId:${userApi.userId}`,
    );
    try {
      const {
        wallet = {
          ethAddress: '',
          ethNonce: 0,
          ethBlockNumAtCreation: 2426642,
        },
      } = await userApi.findFromDb();
      /* tslint:disable: prefer-const */
      let {
        ethAddress,
        ethNonce: nonce,
        ethBlockNumAtCreation: blockNumAtCreation,
      } = wallet;
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getEthAddress.ethAddress:${ethAddress}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getEthAddress.nonce:${nonce}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getEthAddress.blockNumAtCreation:${blockNumAtCreation}`,
      );
      /* tslint:enable:prefer-const */
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
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getTransactions.address:${address}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getTransactions.blockNumAtCreation:${blockNumAtCreation}`,
      );
      const transactions = await this.etherscan.getHistory(
        address,
        blockNumAtCreation,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.getTransactions.transactions.length:${
          transactions.length
        }`,
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
        logger.warn(
          `walletApi.coin-wallets.EthWallet.ensureEthAddressMatchesPkey.mismatch:${
            userApi.userId
          },${address},${addressFromDb}`,
        );
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
    logger.debug(
      `walletApi.coin-wallets.EthWallet.requireValidAddress.maybeAddress:${maybeAddress}`,
    );
    try {
      const isAddress = !!(await this.provider.resolveName(maybeAddress));
      logger.debug(
        `walletApi.coin-wallets.EthWallet.requireValidAddress.isAddress:${isAddress}`,
      );
      if (!isAddress) throw new Error(`Invalid address ${maybeAddress}`);
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.EthWallet.requireValidAddress.catch:${error}`,
      );
      throw error;
    }
  }

  async send(userApi: UserApi, outputs: ISendOutput[], walletPassword: string) {
    const [{ to, amount }] = outputs;
    logger.debug(
      `walletApi.coin-wallets.EthWallet.send.userId:${userApi.userId}`,
    );

    logger.debug(`walletApi.coin-wallets.EthWallet.send.amount:${amount}`);
    logger.debug(
      `walletApi.coin-wallets.EthWallet.send.!!walletPassword:${!!walletPassword}`,
    );
    try {
      this.requireValidAddress(to);
      const value = utils.parseEther(amount);
      const { nonce, ethAddress } = await this.getEthAddress(userApi);
      logger.debug(`walletApi.coin-wallets.EthWallet.send.nonce:${nonce}`);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.ethAddress:${ethAddress}`,
      );
      await this.requireEnoughBalanceToSendEther(ethAddress, value);
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.!!encryptedPrivateKey:${!!encryptedPrivateKey}`,
      );
      const privateKey = this.decrypt(encryptedPrivateKey, walletPassword);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.!!privateKey:${!!privateKey}`,
      );
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const transaction = await wallet.sendTransaction({
        nonce,
        to,
        value,
        gasLimit: 21001,
      });
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.!!privateKey:${!!privateKey}`,
      );
      const { hash: txHash } = transaction;
      logger.debug(`walletApi.coin-wallets.EthWallet.send.txHash:${txHash}`);
      await userApi.incrementTxCount();
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.incrementTxCount: done`,
      );
      this.ensureEthAddressMatchesPkey(wallet, ethAddress, userApi);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.send.ensureEthAddressMatchesPkey: done`,
      );
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
      logger.warn(`walletApi.coin-wallets.EthWallet.send.catch:${error}`);
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
      logger.debug(
        `walletApi.coin-wallets.EthWallet.toEther.wei:${wei.toHexString()}`,
      );
      logger.debug(`walletApi.coin-wallets.EthWallet.toEther.negate:${negate}`);
      const inEther = utils.formatEther(wei);
      return `${negate ? '-' : ''}${inEther}`;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.EthWallet.toEther.catch:${error}`);
      throw error;
    }
  }

  protected toWei(ether: string): utils.BigNumber {
    logger.debug(`walletApi.coin-wallets.EthWallet.toWei.ether:${ether}`);
    try {
      const amount = utils.parseEther(ether);
      logger.debug(`walletApi.coin-wallets.EthWallet.toWei.amount:${amount}`);
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
      logger.debug(
        `walletApi.coin-wallets.EthWallet.formatTransactions.transactions.length:${
          transactions.length
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.formatTransactions.address:${address}`,
      );
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
        logger.silly(
          `walletApi.coin-wallets.EthWallet.formatTransactions.returnTx:${JSON.stringify(
            returnTx,
          )}`,
        );
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
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.userId:${
          userApi.userId
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.!!oldPassword:${!!oldPassword}`,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.!!newPassword:${!!newPassword}`,
      );
      const encryptedPrivateKey = await this.getPrivateKey(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.!!encryptedPrivateKey:${!!encryptedPrivateKey}`,
      );
      const privateKey = this.decrypt(encryptedPrivateKey, oldPassword);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.!!privateKey:${!!privateKey}`,
      );
      const reEncryptedPrivateKey = this.encrypt(privateKey, newPassword);
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.!!reEncryptedPrivateKey:${!!reEncryptedPrivateKey}`,
      );
      const response = await credentialService.create(
        userApi.userId,
        'ETH',
        PRIVATEKEY,
        reEncryptedPrivateKey,
      );
      logger.debug(
        `walletApi.coin-wallets.EthWallet.recoverWallet.credentialCreate.response.status:${
          response.status
        }`,
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
