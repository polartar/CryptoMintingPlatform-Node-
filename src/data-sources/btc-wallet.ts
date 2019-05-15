import WalletBase from './wallet-base';
import { sha256 } from 'js-sha256';
import { v4 as generateRandomId } from 'uuid';
import config from '../common/config';
import { credentialService } from '../services';
const { WalletClient } = require('bclient');
const autoBind = require('auto-bind');
class BtcWallet extends WalletBase {
  walletClient: any;
  constructor() {
    super('Bitcoin', 'BTC', null);
    autoBind(this);
    this.walletClient = new WalletClient(config.bcoinWallet);
  }

  async createWallet(userId: string) {
    try {
      const { token } = await this.walletClient.createWallet(userId);
      const userWallet = this.walletClient.wallet(userId, token);
      const {
        key: { xprivkey },
        mnemonic: { phrase: mnemonic },
      } = await userWallet.getMaster();
      const tokenSavePromise = credentialService.create(
        userId,
        this.symbol,
        'token',
        token,
      );
      const privKeySavePromise = credentialService.create(
        userId,
        this.symbol,
        'privkey',
        xprivkey,
      );
      const mnemonicSavePromise = credentialService.create(
        userId,
        this.symbol,
        'mnemonic',
        mnemonic,
      );
      await Promise.all([
        tokenSavePromise,
        privKeySavePromise,
        mnemonicSavePromise,
      ]);
      const passphrase = await this.newPassphrase(userId);
      console.log('LOG: BtcWallet -> createWallet -> passphrase', passphrase);
      const setPassResponse = await userWallet.setPassphrase(passphrase);
      console.log(
        'LOG: BtcWallet -> createWallet -> setPassResponse',
        setPassResponse,
      );
      const { success } = setPassResponse;
      if (!success) throw new Error('Passphrase set was unsuccessful');
      return token;
    } catch (error) {
      throw error;
    }
  }

  async estimateFee() {
    return {
      medium: this.satToBtc(10000 / 4),
    };
  }

  private async newPassphrase(userId: string) {
    const passphrase = sha256(generateRandomId()).slice(0, 32);
    await credentialService.create(
      userId,
      this.symbol,
      'passphrase',
      passphrase,
    );
    return passphrase;
  }

  private satToBtc(satoshis: number) {
    return satoshis / 100000000;
  }

  private btcToSat(btc: number) {
    return btc * 100000000;
  }

  async getTransactions(account = 'default') {
    // if (!this.wallet) throw new Error('Wallet has not been initialized');
    // const history = await this.wallet.getHistory(account);
    // return this.formatTransactions(history);
  }

  // private formatTransactions(transactions) {
  //   const formattedTransactions = transactions.map(transaction => {
  //     const { block, confirmations, mdate, fee, outputs, hash } = transaction;
  //     const formattedTx = {
  //       status: block === null ? 'Pending' : 'Complete',
  //       confirmations,
  //       timestamp: new Date(mdate).getTime() / 1000,
  //       fee: `${this.satToBtc(fee)} BTC`,
  //       txLink: `https://live.blockcypher.com/btc-testnet/tx/${hash}/`,
  //     };
  //     if (fee) {
  //       // I sent this tx
  //       const { to, from, amount } = outputs.reduce(
  //         (total, output) => {
  //           if (!output.path) {
  //             total.to = output.address;
  //             total.amount += this.satToBtc(output.value);
  //           } else {
  //             total.from = output.address;
  //           }
  //           return total;
  //         },
  //         { to: '', from: '', amount: 0 },
  //       )
  //       return { ...formattedTx, to, from, amount, type: 'withdrawal' };
  //     } else {
  //       // I received this tx
  //       const { to, from, amount } = outputs.reduce(
  //         (total, output) => {
  //           if (output.path) {
  //             total.to = output.address;
  //             total.amount += this.satToBtc(output.value);
  //           } else {
  //             total.from = output.address;
  //           }
  //           return total;
  //         },
  //         { to: '', from: '', amount: 0 },
  //       );
  //       return { ...formattedTx, to, from, amount, type: 'deposit' };
  //     }
  //   });
  //   return formattedTransactions;
  // }

  async getBalance(userId: string) {
    const userWallet = await this.setWallet(userId);
    const balanceResult = await userWallet.getAccount('default');
    console.log('LOG: BtcWallet -> getBalance -> balanceResult', balanceResult);
    const {
      balance: { confirmed, unconfirmed },
    } = balanceResult;
    console.log({
      symbol: this.symbol,
      name: this.name,
      confirmed: this.satToBtc(confirmed),
      unconfirmed: this.satToBtc(unconfirmed),
    });
    return {
      symbol: this.symbol,
      name: this.name,
      balance: {
        confirmed: this.satToBtc(confirmed),
        unconfirmed: this.satToBtc(unconfirmed),
      },
    };
  }

  private async setWallet(userId: string) {
    const token = await this.getToken(userId);
    console.log('LOG: BtcWallet -> privatesetWallet -> token', token);
    return this.walletClient.wallet(userId, token);
  }

  private async getToken(userId: string) {
    const token = await credentialService
      .get(userId, this.symbol, 'token')
      .catch(err => {
        if (err.response && err.response.status === 404) {
          return this.createWallet(userId);
        }
        throw err;
      });
    return token;
  }

  async send(address: string, value: string) {
    // if (!this.wallet) throw new Error('Wallet has not been initialized');
    // const result = await this.wallet.send({
    //   account: 'default',
    //   passphrase: passphrase,
    //   rate: 10000,
    //   outputs: [
    //     {
    //       value: Math.round(this.btcToSat(value)),
    //       address: address,
    //     },
    //   ],
    // });
    // return result;
  }
}

export default BtcWallet;
