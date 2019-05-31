import Db from './db';
import { Account } from '../models';
import * as bip39 from 'bip39';
const hdKey = require('ethereumjs-wallet/hdkey');
const Web3 = require('web3');
import { credentialService, ethService } from '../services';
import * as ethereumUtil from 'ethereumjs-util';
import * as ethers from 'ethers';
import WalletBase from './wallet-base';
const ethereumTx = require('ethereumjs-tx');
import config from '../common/config';
import { IAccount } from '../models/account';
import { ITransaction, IEtherscanTx } from '../types';

class EthAPI extends WalletBase {
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';
  web3 = new Web3(config.ethNodeUrl);
  constructor() {
    super('Ethereum', 'ETH', null);
  }

  private async createAccount(accountId: string) {
    const mnemonic = bip39.generateMnemonic(256);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const masterWallet = hdKey.fromMasterSeed(seed);
    const privateKey = masterWallet.getWallet()._privKey.toString('hex');
    const address = masterWallet.getWallet().getChecksumAddressString();

    const mnemonicPromise = credentialService.create(
      accountId,
      this.symbol,
      'mnemonic',
      mnemonic,
    );

    const privateKeyPromise = credentialService.create(
      accountId,
      this.symbol,
      'privkey',
      privateKey,
    );

    const addressSavePromise = this.saveAddress(accountId, address);

    await Promise.all([mnemonicPromise, privateKeyPromise, addressSavePromise]);

    return address;
  }

  private async saveAddress(accountId: string, ethAddress: string) {
    const ethBlockNumAtCreation = await this.web3.eth.getBlockNumber();
    const result = await Account.findByIdAndUpdate(accountId, {
      ethAddress,
      ethBlockNumAtCreation,
    });
    return result;
  }

  private getPrivateKey(accountId: string) {
    return credentialService.get(accountId, this.symbol, 'privkey');
  }

  public async estimateFee() {
    const gasPrice = await this.web3.eth.getGasPrice();
    const feeEstimate = +gasPrice * 21001;
    return this.toEther(feeEstimate);
  }

  async getBalance(userAccount: IAccount) {
    let { ethAddress } = userAccount;
    if (!ethAddress) {
      ethAddress = await this.createAccount(userAccount.id);
    }
    const balance = await this.web3.eth.getBalance(ethAddress);
    const feeEstimate = +(await this.estimateFee());
    return {
      accountId: userAccount.id,
      symbol: this.symbol,
      name: this.name,
      receiveAddress: ethAddress,
      feeEstimate,
      balance: {
        unconfirmed: 0,
        confirmed: this.toEther(balance),
      },
    };
  }

  async getTransactions(userAccount: IAccount): Promise<ITransaction[]> {
    const {
      ethAddress: address,
      ethBlockNumAtCreation: currentBlock = 0,
    } = userAccount;
    const transactions = await ethService.getEthTransactions(address);
    return this.formatTransactions(transactions, address);
  }

  private sendSignedTransaction(rawTx: string) {
    return new Promise((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(rawTx, (err: Error, result: any) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }

  async send(userAccount: IAccount, to: string, amount: number) {
    try {
      const privateKey = await this.getPrivateKey(userAccount.id);
      const nonce = await this.web3.eth.getTransactionCount(
        userAccount.ethAddress,
      );
      const { rawTransaction } = await this.web3.eth.accounts.signTransaction(
        {
          to,
          value: this.toWei(amount),
          gas: 21001,
          nonce,
        },
        privateKey,
      );
      const txHash = await this.sendSignedTransaction(rawTransaction);
      return {
        success: true,
        message: txHash,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private toEther(wei: number) {
    return +this.web3.utils.fromWei(`${wei}`);
  }

  private toWei(ether: number) {
    return +this.web3.utils.toWei(`${ether}`);
  }

  private formatTransactions(
    transactions: IEtherscanTx[],
    address: string,
  ): ITransaction[] {
    return transactions.map(rawTx => {
      const {
        hash,
        blockNumber,
        confirmations,
        timeStamp,
        gasUsed,
        gasPrice,
        to,
        from,
        value,
      } = rawTx;
      const fee = +gasUsed * +gasPrice;
      return {
        id: hash,
        status: blockNumber !== null ? 'Complete' : 'Pending',
        confirmations: +confirmations,
        timestamp: +timeStamp,
        fee: this.toEther(fee),
        link: `${config.ethTxLink}/${hash}`,
        to: to,
        from: from,
        type: to === address.toLowerCase() ? 'Deposit' : 'Withdrawal',
        amount: this.toEther(+value),
      };
    });
  }
}

export default EthAPI;
