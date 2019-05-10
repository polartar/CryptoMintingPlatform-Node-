import Db from './db';
import { User } from '../models';
import { WalletBase } from './wallet-base';
import { sha256 } from 'js-sha256';
import { v4 as generateRandomId } from 'uuid';
import config from '../common/config';
import { Wallet } from 'ethers';
const { WalletClient } = require('bclient');

class BtcAPI extends WalletBase {
  walletClient = new WalletClient(config.bcoinWallet);
  constructor() {
    super('Bitcoin', 'BTC', null);
  }

  async createWallet(userId: string) {
    const passphrase = sha256(generateRandomId()).slice(0, 32);
    try {
      const createdWallet = await this.walletClient.createWallet(userId, {
        passphrase: passphrase,
      });
      const wallet = this.walletClient.wallet(userId, createdWallet.token);
      const { receivingAddress } = await wallet.createAddress('default');
      return {
        address: receivingAddress,
      };
    } catch (error) {
      throw error;
    }
  }

  async estimateFee() {
    return {
      medium: this.satToBtc(10000 / 4),
    };
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

  async getBalance(account = 'default') {
    // if (!this.wallet) throw new Error('Wallet has not been initialized');
    // const balance = await this.wallet.getAccount(account);
    // const {
    //   balance: { confirmed, unconfirmed },
    // } = balance;
    // return {
    //   confirmed: this.satToBtc(confirmed),
    //   unconfirmed: this.satToBtc(unconfirmed)
    // };
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

export default BtcAPI;
