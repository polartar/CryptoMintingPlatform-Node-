// The getBalance function is working in this interface. It expects an account ID as an argument (one user can have multiple accounts.) If there is no bcoin wallet for the specified account ID, one is created and all of the necessary credentials are stored in the apiKeyService

import WalletBase from './wallet-base';
import { sha256 } from 'js-sha256';
import { v4 as generateRandomId } from 'uuid';
import config from '../common/config';
import { credentialService } from '../services';
import { ITransaction } from '../types';
import { IAccount } from '../models/account';
const { WalletClient } = require('bclient');
const autoBind = require('auto-bind');

interface IBtcRawOutput {
  path: string;
  address: string;
  value: number;
}

interface IBcoinTx {
  block: number;
  confirmations: number;
  mdate: Date;
  fee: number;
  outputs: IBtcRawOutput[];
  hash: string;
}
class BtcWallet extends WalletBase {
  feeRate = 20000;
  // To my knowledge, bcoin hasn't implemented types to their client.
  walletClient: any;
  constructor() {
    super('Bitcoin', 'BTC', null);
    autoBind(this);
    // This is the client configured to interact with bcoin;
    this.walletClient = new WalletClient(config.bcoinWallet);
  }

  async createWallet(accountId: string) {
    // This method is called if the getBalance method errors out with a 404 from bcoin, meaning the user doesn't have a wallet for that account yet.
    try {
      // This creates a wallet based off of the account ID. The walletId in bcoin === the accountId from mongoDB
      const { token } = await this.walletClient.createWallet(accountId);
      // Set the wallet  so that we can get the mnemonic and xprivkey
      const userWallet = this.walletClient.wallet(accountId, token);
      // Request the xPrivKey and mnemenonic from bcoin. Its necessary to request this data before we set a password to the wallet which encrypts it forever.
      const {
        key: { xprivkey },
        mnemonic: { phrase: mnemonic },
      } = await userWallet.getMaster();
      // Sends the token to be saved in the apiKeyService
      const tokenSavePromise = credentialService.create(
        accountId,
        this.symbol,
        'token',
        token,
      );
      // Sends the xprivkey to be saved in the apiKeyService
      const privKeySavePromise = credentialService.create(
        accountId,
        this.symbol,
        'privkey',
        xprivkey,
      );
      // Sends the mnemonic to be saved in the apiKeyService
      const mnemonicSavePromise = credentialService.create(
        accountId,
        this.symbol,
        'mnemonic',
        mnemonic,
      );
      // Wait for all of the requests to the apiKeyService to resolve for maximum concurrency
      await Promise.all([
        tokenSavePromise,
        privKeySavePromise,
        mnemonicSavePromise,
      ]);
      // generate a new passphrase (it also saves the passphrase to the apiKeyService inside that method)
      const passphrase = await this.newPassphrase(accountId);
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
    const estimate = this.satToBtc(this.feeRate / 4);
    return Promise.resolve(estimate);
  }

  private async newPassphrase(accountId: string) {
    // Generate a random passphrase
    const passphrase = sha256(generateRandomId()).slice(0, 32);
    // Save passphrase to the keyService
    await credentialService.create(
      accountId,
      this.symbol,
      'passphrase',
      passphrase,
    );
    // Return passphrase that will be used to encrypt the bcoin wallet.
    return passphrase;
  }

  // Util function to convert satoshis to btc
  private satToBtc(satoshis: number) {
    return satoshis / 100000000;
  }

  // Util function to convert btc to satoshis
  private btcToSat(btc: number) {
    return btc * 100000000;
  }

  // Old code from the old front-end-only method
  public async getTransactions(userAccount: IAccount): Promise<ITransaction[]> {
    const accountId = userAccount.id;
    const userWallet = await this.setWallet(accountId);
    const history = await userWallet.getHistory('default');
    return this.formatTransactions(history);
  }

  private formatTransactions(transactions: IBcoinTx[]): ITransaction[] {
    const formattedTransactions = transactions.map(transaction => {
      const { block, confirmations, mdate, fee, outputs, hash } = transaction;
      const formattedTx = {
        id: hash,
        status: block === null ? 'Pending' : 'Complete',
        confirmations,
        timestamp: new Date(mdate).getTime() / 1000,
        fee: this.satToBtc(fee),
        link: `${config.btcTxLink}/${hash}/`,
      };
      if (fee) {
        // I sent this tx
        const { to, from, amount } = outputs.reduce(
          (formedOutput, rawOutput) => {
            if (!rawOutput.path) {
              formedOutput.to = rawOutput.address;
              formedOutput.amount += this.satToBtc(rawOutput.value);
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: '', from: '', amount: 0 },
        );
        return { ...formattedTx, to, from, amount, type: 'withdrawal' };
      } else {
        // I received this tx
        const { to, from, amount } = outputs.reduce(
          (formedOutput, rawOutput) => {
            if (rawOutput.path) {
              formedOutput.to = rawOutput.address;
              formedOutput.amount += this.satToBtc(rawOutput.value);
            } else {
              formedOutput.from = rawOutput.address;
            }
            return formedOutput;
          },
          { to: '', from: '', amount: 0 },
        );
        return { ...formattedTx, to, from, amount, type: 'deposit' };
      }
    });
    return formattedTransactions;
  }

  public async getBalance(userAccount: IAccount) {
    const accountId = userAccount.id;
    // retreives the bcoin wallet interface based off of the specified accountId
    const userWallet = await this.setWallet(accountId);
    // request the wallet balance from bcoin
    const balanceResult = await userWallet.getAccount('default');
    // Pull the confirmed and unconfirmed properties off of the balance response. I'm pretty sure the unconfirmed amount included the confirmed amount for some reason. ¯\_(ツ)_/¯ so it may make more sense to subtract the confirmed from the unconfirmed to get the truely unconfirmed amount.
    const {
      receiveAddress,
      balance: { confirmed, unconfirmed },
    } = balanceResult;

    const feeEstimate = this.estimateFee();

    // Return the balance based on this standardized shape.
    return {
      accountId,
      symbol: this.symbol,
      name: this.name,
      feeEstimate,
      receiveAddress,
      balance: {
        confirmed: this.satToBtc(confirmed),
        unconfirmed: this.satToBtc(unconfirmed - confirmed),
      },
    };
  }

  // Returns the bcoin wallet interface
  private async setWallet(accountId: string) {
    // Get the token from the apiKeyService
    const token = await this.getToken(accountId);
    // Return the configured wallet.
    return this.walletClient.wallet(accountId, token);
  }

  private async getToken(accountId: string) {
    // request the token from the apiKeyService. This must be sent along to bcoin with each request for security
    const token = await credentialService
      .get(accountId, this.symbol, 'token')
      .catch(err => {
        if (err.response && err.response.status === 404) {
          // If there is no token found in the service, create a new wallet. this.createWallet also returns the token so in either case, a token is returned
          return this.createWallet(accountId);
        }
        throw err;
      });
    return token;
  }

  private async getPassphrase(accountId: string) {
    const passphrase = await credentialService.get(
      accountId,
      this.symbol,
      'passphrase',
    );

    return passphrase;
  }

  async send(
    userAccount: IAccount,
    to: string,
    amount: number,
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      const accountId = userAccount.id;
      const userWallet = await this.setWallet(accountId);
      const passphrase = await this.getPassphrase(accountId);
      const { hash } = await userWallet.send({
        account: 'default',
        passphrase: passphrase,
        //10000 satoshis per kilobyte for a fee?
        rate: this.feeRate,
        outputs: [
          {
            value: Math.round(this.btcToSat(amount)),
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
