// The getBalance function is working in this interface. It expects an account ID as an argument (one user can have multiple accounts.) If there is no bcoin wallet for the specified account ID, one is created and all of the necessary credentials are stored in the apiKeyService

import CoinWalletBase from './coin-wallet-base';
import { v4 as generateRandomId } from 'uuid';
import { config, logger } from '../../common';
import { credentialService } from '../../services';
import { ITransaction, ICoinMetadata, IBcoinTx } from '../../types';
import { UserApi } from '../../data-sources';
import { BigNumber } from 'bignumber.js';
const { WalletClient } = require('bclient');
const autoBind = require('auto-bind');

const XPRIVKEY = 'xprivkey';
const TOKEN = 'token';
const PASSPHRASE = 'passphrase'

class BtcWallet extends CoinWalletBase {
  feeRate = 10000;
  // To my knowledge, bcoin hasn't implemented types to their client.
  walletClient: any;

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
    // This is the client configured to interact with bcoin;
    this.walletClient = new WalletClient(config.bcoinWallet);
  }

  public async checkIfWalletExists(userApi: UserApi) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.checkIfWalletExists.userId:${userApi && userApi.userId}`)
      const userWallet = await this.setWallet(userApi.userId);
      const account = await userWallet.getAccount('default');
      logger.debug(`walletApi.coin-wallets.BtcWallet.checkIfWalletExists.!!account: ${!!account}`)
      return !!account;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.checkIfWalletExists.catch: ${error}`)
      return false;
    }
  }

  public async createWallet(userApi: UserApi, userPassword: string, mnemonic: string) {
    const { userId } = userApi
    logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.userId: ${userId}`)
    const passphrase = await this.selectAndMaybeSavePassphrase(userId, userPassword)
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.userId: ${userId}`)
      const { token } = await this.walletClient.createWallet(userId, { mnemonic });
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.token.length: ${token.length}`)
      const userWallet = this.walletClient.wallet(userId, token);
      const {
        key: { xprivkey },
      } = await userWallet.getMaster();
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.token.!!xprivkey: ${!!xprivkey}`)

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

      // Wait for all of the requests to the apiKeyService to resolve for maximum concurrency
      const [tokenSaveFulfilled, privKeySaveFulfilled] = await Promise.all([
        tokenSavePromise,
        privKeySavePromise,
      ]);
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.tokenSaveFulfilled.status: ${tokenSaveFulfilled.status}`)
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.privKeySaveFulfilled.status: ${privKeySaveFulfilled.status}`)
      // Send the generated passphrase to bcoin to encrypt the user's wallet. Success: boolean will be returned
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.setPassphrase:before`)
      const { success } = await userWallet.setPassphrase(passphrase);
      logger.debug(`walletApi.coin-wallets.BtcWallet.createWallet.setPassphrase.success`)
      if (!success) throw new Error('Passphrase set was unsuccessful');
      return true;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.createWallet.catch: ${error}`)
      throw error;
    }
  }

  public estimateFee() {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.estimateFee`)
      const feeRate = new BigNumber(this.feeRate);
      logger.debug(`walletApi.coin-wallets.BtcWallet.estimateFee.feeRate ${feeRate.toFixed()}`)
      const estimate = this.satToBtc(feeRate.div(4));
      logger.debug(`walletApi.coin-wallets.BtcWallet.estimateFee.estimate ${estimate.toFixed()}`)
      return Promise.resolve(estimate.toFixed());
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.estimateFee.catch: ${error}`)
    }
    // Cant remember why we used this formula to estimate the fee
  }

  private async selectAndMaybeSavePassphrase(userId: string, userPassphrase: string) {
    try {

      logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.userId:${userId}`)
      logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!userPassphrase:${!!userPassphrase}`)
      logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.config.clientSecretKeyRequired ${config.clientSecretKeyRequired}`)
      if (config.clientSecretKeyRequired) {
        logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!userPassphrase ${!!userPassphrase}`)
        if (!userPassphrase) throw new Error('Passphrase required')
        return userPassphrase
      } else {
        logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.randomPassphrase`)
        // Generate a random passphrase
        const randomPassword = this.hash(generateRandomId());
        logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.!!randomPassword:${!!randomPassword}`)
        logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.saveCredential: before`)
        await credentialService.create(userId, this.symbol, PASSPHRASE, randomPassword);
        logger.debug(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.saveCredential: after`)
        return randomPassword;
      }
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.selectAndMaybeSavePassphrase.catch:${error}`)
      throw error;
    }
  }

  // Util function to convert satoshis to btc
  private satToBtc(satoshis: BigNumber) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.satToBtc.satoshis:${satoshis.toFixed()}`)
      return satoshis.div(100000000);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.satToBtc.catch:${error}`)
    }

  }

  // Util function to convert btc to satoshis
  private btcToSat(btc: BigNumber) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.btcToSat.btc:${btc.toFixed()}`)
      return btc.multipliedBy(100000000);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.btcToSat.catch:${error}`)
      throw error;
    }
  }

  public async getTransactions(userId: string): Promise<ITransaction[]> {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.getTransactions.userId:${userId}`)
      const userWallet = await this.setWallet(userId);
      const history = await userWallet.getHistory('default');
      logger.debug(`walletApi.coin-wallets.BtcWallet.getTransactions.history.length:${history.length}`)
      return this.formatTransactions(history);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getTransactions.catch:${error}`)
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
              formedOutput.to = rawOutput.address;
              formedOutput.amount = formedOutput.amount.plus(
                this.satToBtc(new BigNumber(rawOutput.value)),
              );
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: '', from: '', amount: new BigNumber(0) },
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
              formedOutput.to = rawOutput.address;
              formedOutput.amount = formedOutput.amount.plus(
                this.satToBtc(new BigNumber(rawOutput.value)),
              );
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: '', from: '', amount: new BigNumber(0) },
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
        logger.silly(`walletApi.coin-wallets.BtcWallet.formatTransactions.forEach(tx):${JSON.stringify(tx)}`)
      })
    }
    return formattedTransactions;
  }

  public async getBalance(userId: string) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.getBalance.userId:${userId}`)
      const userWallet = await this.setWallet(userId);
      const balanceResult = await userWallet.getAccount('default');
      logger.debug(`walletApi.coin-wallets.BtcWallet.getBalance.balanceResult.confirmed:${balanceResult.confirmed}`)
      logger.debug(`walletApi.coin-wallets.BtcWallet.getBalance.balanceResult.unconfirmed:${balanceResult.unconfirmed}`)
      const {
        balance: { confirmed, unconfirmed },
      } = balanceResult;
      const confirmedBalance = new BigNumber(confirmed);
      const unconfirmedBalance = new BigNumber(unconfirmed).minus(
        confirmedBalance,
      );
      return {
        confirmed: this.satToBtc(confirmedBalance).toFixed(),
        unconfirmed: this.satToBtc(unconfirmedBalance).toFixed(),
      };
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getBalance.catch:${error}`)
      throw error;
    }
  }

  public async getWalletInfo(userApi: UserApi) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.getWalletInfo.userapi.userId:${userApi.userId}`)
      const userWallet = await this.setWallet(userApi.userId);
      logger.debug(`walletApi.coin-wallets.BtcWallet.getWalletInfo.userWallet.getAccount: before`)
      const { receiveAddress } = await userWallet.getAccount('default');
      logger.debug(`walletApi.coin-wallets.BtcWallet.getWalletInfo.userWallet.getAccount.receiveAddress: ${receiveAddress}`)
      return {
        receiveAddress: receiveAddress,
        symbol: this.symbol,
        name: this.name,
        backgroundColor: this.backgroundColor,
        icon: this.icon,
      };
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getWalletInfo.catch: ${error}`)
      throw error;
    }
  }

  private async setWallet(accountId: string) {
    try {
      logger.debug(`walletApi.coin-wallets.BtcWallet.setWallet.accountId:${accountId}`)
      const token = await this.getToken(accountId);
      logger.debug(`walletApi.coin-wallets.BtcWallet.setWallet.token.length:${token.length}`)
      return this.walletClient.wallet(accountId, token);
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.setWallet.catch:${error}`)
    }
  }

  private async getToken(accountId: string) {
    logger.debug(`walletApi.coin-wallets.BtcWallet.getToken.accountId:${accountId}`)
    try {
      const token = await credentialService
        .get(accountId, this.symbol, TOKEN)
      logger.debug(`walletApi.coin-wallets.BtcWallet.getToken.!!token:${!!token}`)
      return token;
    } catch (err) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.getToken.error:${err}`)
      credentialService.handleErrResponse(err, 'Not Found');
    }
  }

  private async getPassphrase(userId: string, userPassword: string) {
    logger.debug(`walletApi.coin-wallets.BtcWallet.getPassphrase.userId:${userId}`)
    logger.debug(`walletApi.coin-wallets.BtcWallet.getPassphrase.!!userPassword:${!!userPassword}`)
    logger.debug(`walletApi.coin-wallets.BtcWallet.getPassphrase.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`)
    if (config.clientSecretKeyRequired) {
      return userPassword
    } else {
      try {
        logger.debug(`walletApi.coin-wallets.BtcWallet.getPassphrase.credentialService.get: before`)
        const passphrase = await credentialService.get(
          userId,
          this.symbol,
          PASSPHRASE,
        );
        logger.debug(`walletApi.coin-wallets.BtcWallet.getPassphrase.credentialService.get.!!passphrase:${!!passphrase}`)
        return passphrase;
      } catch (error) {
        logger.warn(`walletApi.coin-wallets.BtcWallet.getPassphrase.catch:${!error}`)
        credentialService.handleErrResponse(error, 'Not Found');
      }
    }
  }

  async send(
    userApi: UserApi,
    to: string,
    amount: string,
    walletPassword: string
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      const accountId = userApi.userId;
      logger.debug(`walletApi.coin-wallets.BtcWallet.send.accountId:${accountId}`)
      const userWallet = await this.setWallet(accountId);
      logger.debug(`walletApi.coin-wallets.BtcWallet.send.!!userWallet:${!!userWallet}`)
      const passphrase = await this.getPassphrase(accountId, walletPassword);
      logger.debug(`walletApi.coin-wallets.BtcWallet.send.!!passphrase:${!!passphrase}`)
      const amountToSend = new BigNumber(amount);
      logger.debug(`walletApi.coin-wallets.BtcWallet.send.!!amountToSend:${amountToSend.toFixed()}`)
      const { hash } = await userWallet.send({
        account: 'default',
        passphrase: passphrase,
        //10000 satoshis per kilobyte for a fee?
        rate: this.feeRate,
        outputs: [
          {
            value: Math.round(this.btcToSat(amountToSend).toNumber()),
            address: to,
          },
        ],
      });
      logger.debug(`walletApi.coin-wallets.BtcWallet.send.hash:${hash}`)
      return {
        message: hash,
        success: true,
      };
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.send.catch:${error}`)
      return {
        success: false,
        message: error.message,
      };
    }
  }

  public async recoverWallet(userApi: UserApi, oldPassword: string, newPassword: string) {
    logger.debug(`walletApi.coin-wallets.BtcWallet.recoverWallet.userApi.userid:${userApi.userId}`)
    logger.debug(`walletApi.coin-wallets.BtcWallet.recoverWallet.!!oldPassword:${!!oldPassword}`)
    logger.debug(`walletApi.coin-wallets.BtcWallet.recoverWallet.!!newPassword:${!!newPassword}`)
    try {
      const wallet = await this.setWallet(userApi.userId);
      logger.debug(`walletApi.coin-wallets.BtcWallet.recoverWallet.wallet:${!!wallet}`)
      const { success } = await wallet.setPassphrase(newPassword, oldPassword)
      logger.debug(`walletApi.coin-wallets.BtcWallet.recoverWallet.success:${success}`)
      return success;
    } catch (error) {
      logger.warn(`walletApi.coin-wallets.BtcWallet.recoverWallet.success:${error}`)
      return false;
    }
  }
}

export default BtcWallet;
