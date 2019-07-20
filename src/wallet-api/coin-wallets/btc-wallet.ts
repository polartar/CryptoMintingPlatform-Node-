// The getBalance function is working in this interface. It expects an account ID as an argument (one user can have multiple accounts.) If there is no bcoin wallet for the specified account ID, one is created and all of the necessary credentials are stored in the apiKeyService

import CoinWalletBase from './coin-wallet-base';
import { v4 as generateRandomId } from 'uuid';
import { config } from '../../common';
import { credentialService } from '../../services';
import { ITransaction, ICoinMetadata, IBcoinTx } from '../../types';
import { UserApi } from '../../data-sources';
import { BigNumber } from 'bignumber.js';
const { WalletClient } = require('bclient');
const autoBind = require('auto-bind');

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

  async createWallet(userApi: UserApi, userPassword: string, mnemonic: string) {
    const { userId } = userApi
    const passphrase = await this.selectAndMaybeSavePassphrase(userId, userPassword)
    try {
      const { token } = await this.walletClient.createWallet(userId, { mnemonic, passphrase });
      const userWallet = this.walletClient.wallet(userId, token);
      const {
        key: { xprivkey },
      } = await userWallet.getMaster();

      // Sends the token to be saved in the apiKeyService
      const tokenSavePromise = credentialService.create(
        userId,
        this.symbol,
        'token',
        token,
      );

      // Sends the xprivkey to be saved in the apiKeyService
      const privKeySavePromise = credentialService.create(
        userId,
        this.symbol,
        'xprivkey',
        this.encrypt(xprivkey, mnemonic),
      );

      const recoveryPassPromise = credentialService.create(
        userId,
        this.symbol,
        this.hash(mnemonic),
        this.encrypt(passphrase, mnemonic),
      );

      // Wait for all of the requests to the apiKeyService to resolve for maximum concurrency
      await Promise.all([
        tokenSavePromise,
        privKeySavePromise,
        recoveryPassPromise
      ]);

      // Send the generated passphrase to bcoin to encrypt the user's wallet. Success: boolean will be returned
      const { success } = await userWallet.setPassphrase(passphrase);
      if (!success) throw new Error('Passphrase set was unsuccessful');
      return token;
    } catch (error) {
      throw error;
    }
  }

  public estimateFee() {
    // Cant remember why we used this formula to estimate the fee
    const feeRate = new BigNumber(this.feeRate);
    const estimate = this.satToBtc(feeRate.div(4));
    return Promise.resolve(estimate.toFixed());
  }

  private async selectAndMaybeSavePassphrase(userId: string, userPassphrase: string) {
    if (config.clientSecretKeyRequired) {
      if (!userPassphrase) throw new Error('Passphrase required')
      return userPassphrase
    } else {
      // Generate a random passphrase
      return this.hash(generateRandomId());
    }
  }

  // Util function to convert satoshis to btc
  private satToBtc(satoshis: BigNumber) {
    return satoshis.div(100000000);
  }

  // Util function to convert btc to satoshis
  private btcToSat(btc: BigNumber) {
    return btc.multipliedBy(100000000);
  }

  // Old code from the old front-end-only method
  public async getTransactions(userId: string): Promise<ITransaction[]> {
    const userWallet = await this.setWallet(userId);
    const history = await userWallet.getHistory('default');
    return this.formatTransactions(history);
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
    return formattedTransactions;
  }

  public async getBalance(userId: string) {
    const userWallet = await this.setWallet(userId);
    const balanceResult = await userWallet.getAccount('default');
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
  }

  public async getWalletInfo(userApi: UserApi) {
    const userWallet = await this.setWallet(userApi.userId);
    const { receiveAddress } = await userWallet.getAccount('default');
    return {
      receiveAddress: receiveAddress,
      symbol: this.symbol,
      name: this.name,
      backgroundColor: this.backgroundColor,
      icon: this.icon,
    };
  }

  private async setWallet(accountId: string) {
    const token = await this.getToken(accountId);

    return this.walletClient.wallet(accountId, token);
  }

  private async getToken(accountId: string) {
    try {
      const token = await credentialService
        .get(accountId, this.symbol, 'token')
      return token;
    } catch (err) {
      credentialService.handleErrResponse(err, 'Not Found');
    }
  }

  private async getPassphrase(userId: string, userPassword: string) {
    if (config.clientSecretKeyRequired && !userPassword) throw new Error('Wallet password is required')
    try {
      const passphrase = await credentialService.get(
        userId,
        this.symbol,
        'passphrase',
      );
      return passphrase;
    } catch (error) {
      credentialService.handleErrResponse(error, 'Not Found');
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
      const userWallet = await this.setWallet(accountId);
      const passphrase = await this.getPassphrase(accountId, walletPassword);
      const amountToSend = new BigNumber(amount);
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
      return {
        message: hash,
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

export default BtcWallet;
