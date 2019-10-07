import CoinWalletBase from './coin-wallet-base';
import { v4 as generateRandomId } from 'uuid';
import { config, logger } from '../../common';
import { credentialService } from '../../services';
import {
  ITransaction,
  ICoinMetadata,
  IBcoinTx,
  ISendOutput,
} from '../../types';
import { UserApi } from '../../data-sources';
import { BigNumber } from 'bignumber.js';
const { WalletClient, NodeClient } = require('bclient');
const autoBind = require('auto-bind');

const XPRIVKEY = 'xprivkey';
const TOKEN = 'token';
const PASSPHRASE = 'passphrase';

class BtcWallet extends CoinWalletBase {
  feeRate = 10000;
  nextFeeFetch = 0;
  // To my knowledge, bcoin hasn't implemented types to their client.
  walletClient: any;
  nodeClient: any;

  constructor({
    name,
    symbol,
    contractAddress,
    abi,
    backgroundColor,
    icon,
  }: ICoinMetadata) {
    super(name, symbol, contractAddress, abi, backgroundColor, icon);
    autoBind(this);
    const { bcoinWallet, bcoinRpc } = config;
    // This is the client configured to interact with bcoin;
    this.walletClient = new WalletClient(bcoinWallet);
    this.nodeClient = bcoinRpc.port ? new NodeClient(bcoinRpc) : undefined;
  }

  public async checkIfWalletExists(userApi: UserApi) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.checkIfWalletExists.userId:${userApi &&
          userApi.userId}`,
      );
      const userWallet = await this.setWallet(userApi.userId);
      const account = await userWallet.getAccount('default');
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.checkIfWalletExists.!!account: ${!!account}`,
      );
      return !!account;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.checkIfWalletExists.catch: ${error}`,
      );
      return false;
    }
  }

  public async createWallet(
    userApi: UserApi,
    userPassword: string,
    mnemonic: string,
  ) {
    const { userId } = userApi;
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.createWallet.userId: ${userId}`,
    );
    const passphrase = await this.selectAndMaybeSavePassphrase(
      userId,
      userPassword,
    );
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.userId: ${userId}`,
      );
      const { token } = await this.walletClient.createWallet(userId, {
        mnemonic,
      });
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.token.length: ${
          token.length
        }`,
      );
      const userWallet = this.walletClient.wallet(userId, token);
      const { receiveAddress } = await userWallet.getAccount('default');
      const {
        key: { xprivkey },
      } = await userWallet.getMaster();
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.token.!!xprivkey: ${!!xprivkey}`,
      );

      // Sends the token to be saved in the apiKeyService
      const tokenSavePromise = credentialService.create(
        userId,
        this.symbol,
        TOKEN,
        token,
      );

      // Sends the xprivkey to be saved in the apiKeyService
      const privKeySavePromise = credentialService.create(
        userId,
        this.symbol,
        XPRIVKEY,
        this.encrypt(xprivkey, mnemonic),
      );

      const receiveAddressSavePromise = userApi.setBtcAddressToUser(
        receiveAddress,
      );

      // Wait for all of the requests to the apiKeyService to resolve for maximum concurrency
      const [
        tokenSaveFulfilled,
        privKeySaveFulfilled,
        receiveAddressSaveFulfilled,
      ] = await Promise.all([
        tokenSavePromise,
        privKeySavePromise,
        receiveAddressSavePromise,
      ]);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.tokenSaveFulfilled.status: ${
          tokenSaveFulfilled.status
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.privKeySaveFulfilled.status: ${
          privKeySaveFulfilled.status
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.receiveAddressSaveFulfilled.wallet.receiveAddress: ${receiveAddressSaveFulfilled &&
          receiveAddressSaveFulfilled.wallet &&
          receiveAddressSaveFulfilled.wallet.btcAddress}`,
      );
      // Send the generated passphrase to bcoin to encrypt the user's wallet. Success: boolean will be returned
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.setPassphrase:before`,
      );
      const { success } = await userWallet.setPassphrase(passphrase);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.createWallet.setPassphrase.success`,
      );
      if (!success) throw new Error('Passphrase set was unsuccessful');
      return true;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.createWallet.catch: ${error}`,
      );
      throw error;
    }
  }

  public async estimateFee(userApi: UserApi) {
    try {
      const now = Date.now();
      if (this.nodeClient && now >= this.nextFeeFetch) {
        const { fee } = await this.nodeClient.execute('estimatesmartfee', [10]);
        if (fee > 0) {
          this.feeRate = Math.floor(fee * 10 ** 8);
          this.nextFeeFetch = now + 600000;
        } else {
          this.feeRate = 10000;
        }
      }
      logger.debug(`walletApi.coin-wallets.BtcWallet.estimateFee`);
      const feeRate = new BigNumber(this.feeRate);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.estimateFee.feeRate ${feeRate.toFixed()}`,
      );
      const estimate = this.satToBtc(feeRate.div(1000).multipliedBy(350));
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.estimateFee.estimate ${estimate.toFixed()}`,
      );
      const { confirmed } = await this.getBalance(userApi.userId);
      const feeData = {
        estimatedFee: estimate.toFixed(),
        feeCurrency: 'BTC',
        feeCurrencyBalance: confirmed,
      };
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.estimateFee.feeData ${JSON.stringify(
          feeData,
        )}`,
      );
      return feeData;
    } catch (error) {
      this.feeRate = 10000;
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.estimateFee.catch: ${error}`,
      );
      throw error;
    }
  }

  private async selectAndMaybeSavePassphrase(
    userId: string,
    userPassphrase: string,
  ) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.userId:${userId}`,
      );
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!userPassphrase:${!!userPassphrase}`,
      );
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.config.clientSecretKeyRequired ${
          config.clientSecretKeyRequired
        }`,
      );
      if (config.clientSecretKeyRequired) {
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!userPassphrase ${!!userPassphrase}`,
        );
        if (!userPassphrase) throw new Error('Passphrase required');
        return userPassphrase;
      } else {
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.randomPassphrase`,
        );
        // Generate a random passphrase
        const randomPassword = this.hash(generateRandomId());
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!randomPassword:${!!randomPassword}`,
        );
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.saveCredential: before`,
        );
        await credentialService.create(
          userId,
          this.symbol,
          PASSPHRASE,
          randomPassword,
        );
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.saveCredential: after`,
        );
        return randomPassword;
      }
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.catch:${error}`,
      );
      throw error;
    }
  }

  // Util function to convert satoshis to btc
  private satToBtc(satoshis: BigNumber) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.satToBtc.satoshis:${satoshis.toFixed()}`,
      );
      return satoshis.div(100000000);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.satToBtc.catch:${error}`);
      throw error;
    }
  }

  // Util function to convert btc to satoshis
  private btcToSat(btc: BigNumber) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.btcToSat.btc:${btc.toFixed()}`,
      );
      return btc.multipliedBy(100000000);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.btcToSat.catch:${error}`);
      throw error;
    }
  }

  public async getTransactions(userId: string): Promise<ITransaction[]> {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getTransactions.userId:${userId}`,
      );
      const userWallet = await this.setWallet(userId);
      const history = await userWallet.getHistory('default');
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getTransactions.history.length:${
          history.length
        }`,
      );
      return this.formatTransactions(history);
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.getTransactions.catch:${error}`,
      );
      throw error;
    }
  }

  private formatTransactions(transactions: IBcoinTx[]): ITransaction[] {
    const formattedTransactions = transactions.map(transaction => {
      const { block, confirmations, mdate, fee, outputs, hash } = transaction;
      const bnFee = this.satToBtc(new BigNumber(fee));
      const formattedTx = {
        id: hash,
        status: block === null ? 'Pending' : 'Complete',
        confirmations,
        timestamp: new Date(mdate).getTime() / 1000,
        fee: bnFee.negated().toFixed(),
        link: `${config.btcTxLink}/${hash}/`,
      };
      if (fee) {
        // I sent this tx
        const { to, from, amount } = outputs.reduce(
          (formedOutput, rawOutput) => {
            if (!rawOutput.path) {
              formedOutput.to.push(rawOutput.address);
              formedOutput.amount = formedOutput.amount.plus(
                this.satToBtc(new BigNumber(rawOutput.value)),
              );
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: [], from: '', amount: new BigNumber(0) },
        );
        return {
          ...formattedTx,
          to,
          from,
          amount: amount.negated().toFixed(),
          type: 'Withdrawal',
          total: amount
            .plus(bnFee)
            .negated()
            .toFixed(),
        };
      } else {
        // I received this tx
        const { to, from, amount } = outputs.reduce(
          (formedOutput, rawOutput) => {
            if (rawOutput.path) {
              formedOutput.to.push(rawOutput.address);
              formedOutput.amount = formedOutput.amount.plus(
                this.satToBtc(new BigNumber(rawOutput.value)),
              );
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: [], from: '', amount: new BigNumber(0) },
        );
        return {
          ...formattedTx,
          to,
          from,
          amount: amount.toFixed(),
          total: amount.toFixed(),
          type: 'Deposit',
        };
      }
    });
    if (config.logLevel === 'silly') {
      formattedTransactions.forEach(tx => {
        logger.silly(
          `walletApi.coin-wallets.BtcWallet.formatTransactions.forEach(tx):${JSON.stringify(
            tx,
          )}`,
        );
      });
    }
    return formattedTransactions;
  }

  public async getBalance(userId: string) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getBalance.userId:${userId}`,
      );
      const userWallet = await this.setWallet(userId);
      const balanceResult = await userWallet.getAccount('default');
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getBalance.balanceResult.confirmed:${
          balanceResult.confirmed
        }`,
      );
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getBalance.balanceResult.unconfirmed:${
          balanceResult.unconfirmed
        }`,
      );
      const {
        balance: { confirmed, unconfirmed },
      } = balanceResult;
      const confirmedBalance = new BigNumber(confirmed);
      const unconfirmedBalance = new BigNumber(unconfirmed);
      const confirmedFixed = this.satToBtc(confirmedBalance).toFixed();
      const unconfirmedFixed = this.satToBtc(unconfirmedBalance).toFixed();
      const balance = {
        confirmed: confirmedFixed.includes('.')
          ? confirmedFixed
          : `${confirmedFixed}.0`,
        unconfirmed: unconfirmedFixed.includes('.')
          ? unconfirmedFixed
          : `${unconfirmedFixed}.0`,
      };
      return balance;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getBalance.catch:${error}`);
      throw error;
    }
  }

  public async getWalletInfo(userApi: UserApi) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getWalletInfo.userapi.userId:${
          userApi.userId
        }`,
      );
      const userWallet = await this.setWallet(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getWalletInfo.userWallet.getAccount: before`,
      );
      const { receiveAddress } = await userWallet.getAccount('default');
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getWalletInfo.userWallet.getAccount.receiveAddress: ${receiveAddress}`,
      );
      userApi.setBtcAddressToUser(receiveAddress);
      return {
        receiveAddress: receiveAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
      };
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.getWalletInfo.catch: ${error}`,
      );
      throw error;
    }
  }

  private async setWallet(accountId: string) {
    try {
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.setWallet.accountId:${accountId}`,
      );
      const token = await this.getToken(accountId);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.setWallet.token.length:${
          token.length
        }`,
      );
      return this.walletClient.wallet(accountId, token);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.setWallet.catch:${error}`);
      throw error;
    }
  }

  private async getToken(accountId: string) {
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.getToken.accountId:${accountId}`,
    );
    try {
      const token = await credentialService.get(accountId, this.symbol, TOKEN);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.getToken.!!token:${!!token}`,
      );
      return token;
    } catch (err) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getToken.error:${err}`);
      credentialService.handleErrResponse(err, 'Not Found');
    }
  }

  private async getPassphrase(userId: string, userPassword: string) {
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.getPassphrase.userId:${userId}`,
    );
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.getPassphrase.!!userPassword:${!!userPassword}`,
    );
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.getPassphrase.config.clientSecretKeyRequired:${
        config.clientSecretKeyRequired
      }`,
    );
    if (config.clientSecretKeyRequired) {
      return userPassword;
    } else {
      try {
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.getPassphrase.credentialService.get: before`,
        );
        const passphrase = await credentialService.get(
          userId,
          this.symbol,
          PASSPHRASE,
        );
        logger.debug(
          `walletApi.coin-wallets.BtcWallet.getPassphrase.credentialService.get.!!passphrase:${!!passphrase}`,
        );
        return passphrase;
      } catch (error) {
        logger.warn(
          `walletApi.coin-wallets.BtcWallet.getPassphrase.catch:${!error}`,
        );
        credentialService.handleErrResponse(error, 'Not Found');
      }
    }
  }

  async send(
    userApi: UserApi,
    outputs: ISendOutput[],
    walletPassword: string,
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    const bcoinOutputs = outputs.map(({ to, amount }) => ({
      address: to,
      value: Math.round(this.btcToSat(new BigNumber(amount)).toNumber()),
    }));
    try {
      const accountId = userApi.userId;
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.send.accountId:${accountId}`,
      );
      const userWallet = await this.setWallet(accountId);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.send.!!userWallet:${!!userWallet}`,
      );
      const passphrase = await this.getPassphrase(accountId, walletPassword);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.send.!!passphrase:${!!passphrase}`,
      );
      const transaction = await userWallet.send({
        account: 'default',
        passphrase: passphrase,
        rate: this.feeRate,
        outputs: bcoinOutputs,
      });
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.send.hash:${transaction.hash}`,
      );
      const { address: from = '' } = transaction.inputs.find(
        (input: any) => !!input.path,
      );
      const fee = new BigNumber(transaction.fee);
      const totalSent = outputs.reduce((total, output) => {
        return total + +output.amount;
      }, 0);
      const toAddresses = outputs.map(output => output.to);
      const response: {
        message: string;
        success: boolean;
        transaction: ITransaction;
      } = {
        message: null,
        success: true,
        transaction: {
          amount: `-${totalSent}`,
          confirmations: transaction.confirmations,
          fee: this.satToBtc(fee).toFixed(),
          from,
          to: toAddresses,
          id: transaction.hash,
          link: `${config.btcTxLink}/${transaction.hash}/`,
          status: 'Pending',
          timestamp: transaction.mtime,
          type: 'Withdrawal',
          total: this.satToBtc(fee)
            .plus(totalSent)
            .negated()
            .toFixed(),
        },
      };
      return response;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.send.catch:${error}`);
      let message;
      switch (error.message) {
        case 'Decipher failed.': {
          message = 'Incorrect Password';
          break;
        }
        case 'Output is dust.': {
          message = 'BTC amount is too low';
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

  public async recoverWallet(
    userApi: UserApi,
    oldPassword: string,
    newPassword: string,
  ) {
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.recoverWallet.userApi.userid:${
        userApi.userId
      }`,
    );
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.recoverWallet.!!oldPassword:${!!oldPassword}`,
    );
    logger.debug(
      `walletApi.coin-wallets.BtcWallet.recoverWallet.!!newPassword:${!!newPassword}`,
    );
    try {
      const wallet = await this.setWallet(userApi.userId);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.recoverWallet.wallet:${!!wallet}`,
      );
      const { success } = await wallet.setPassphrase(newPassword, oldPassword);
      logger.debug(
        `walletApi.coin-wallets.BtcWallet.recoverWallet.success:${success}`,
      );
      return success;
    } catch (error) {
      logger.warn(
        `walletApi.coin-wallets.BtcWallet.recoverWallet.success:${error}`,
      );
      return false;
    }
  }
}

export default BtcWallet;
