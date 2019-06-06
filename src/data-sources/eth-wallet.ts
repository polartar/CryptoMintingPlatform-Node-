import { Account } from '../models';
import * as bip39 from 'bip39';
const hdKey = require('ethereumjs-wallet/hdkey');
const Web3 = require('web3');
import { credentialService, ethService } from '../services';
import WalletBase from './wallet-base';
import config from '../common/config';
import { IAccount } from '../models/account';
import { ITransaction, IEtherscanTx } from '../types';

class EthAPI extends WalletBase {
  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';
  web3 = new Web3(config.ethNodeUrl);
  constructor(
    name: string,
    symbol: string,
    contract: string,
    abi: any,
    backgroundColor: string,
    icon: string,
  ) {
    super(name, symbol, contract, abi, backgroundColor, icon);
  }

  protected async createAccount(accountId: string) {
    const mnemonic = bip39.generateMnemonic(256);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const masterWallet = hdKey.fromMasterSeed(seed);
    const privateKey = masterWallet.getWallet()._privKey.toString('hex');
    const address = masterWallet.getWallet().getChecksumAddressString();

    const mnemonicPromise = credentialService.create(
      accountId,
      'ETH',
      'mnemonic',
      mnemonic,
    );

    const privateKeyPromise = credentialService.create(
      accountId,
      'ETH',
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

  protected getPrivateKey(accountId: string) {
    return credentialService.get(accountId, 'ETH', 'privkey');
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
      feeEstimate: feeEstimate.toString(),
      balance: {
        unconfirmed: '0',
        confirmed: this.toEther(balance).toString(),
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

  protected sendSignedTransaction(rawTx: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(rawTx, (err: Error, result: any) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }

  protected async signTransaction(
    from: string,
    to: string,
    amount: number,
    privateKey: string,
    gas: number,
    data?: any,
  ) {
    const nonce = await this.web3.eth.getTransactionCount(from);
    const { rawTransaction } = await this.web3.eth.accounts.signTransaction(
      {
        to,
        value: this.toWei(amount),
        gas: gas,
        nonce,
        data,
      },
      privateKey,
    );
    return rawTransaction;
  }

  async send(userAccount: IAccount, to: string, amount: string) {
    try {
      const privateKey = await this.getPrivateKey(userAccount.id);
      const rawTransaction = await this.signTransaction(
        userAccount.ethAddress,
        to,
        +amount,
        privateKey,
        21001,
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

  protected toEther(wei: number) {
    return +this.web3.utils.fromWei(`${wei}`);
  }

  protected toWei(ether: number) {
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
        fee: this.toEther(fee).toString(),
        link: `${config.ethTxLink}/${hash}`,
        to: to,
        from: from,
        type: to === address.toLowerCase() ? 'Deposit' : 'Withdrawal',
        amount: this.toEther(+value).toString(),
      };
    });
  }
}

export default EthAPI;
