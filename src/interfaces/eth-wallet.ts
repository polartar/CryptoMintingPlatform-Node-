import * as bip39 from 'bip39';
const hdKey = require('ethereumjs-wallet/hdkey');
const Web3 = require('web3');
import { credentialService, ethService } from '../services';
import WalletBase from './wallet-base';
import config from '../common/config';
import { ITransaction, IEtherscanTx } from '../types';
import { UserApi } from '../data-sources';
import BigNumber from 'bignumber.js';

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

  protected async createAccount(userApi: UserApi) {
    const mnemonic = bip39.generateMnemonic(256);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const masterWallet = hdKey.fromMasterSeed(seed);
    const privateKey = masterWallet.getWallet()._privKey.toString('hex');
    const address = masterWallet.getWallet().getChecksumAddressString();

    const mnemonicPromise = credentialService.create(
      userApi.userId,
      'ETH',
      'mnemonic',
      mnemonic,
    );

    const privateKeyPromise = credentialService.create(
      userApi.userId,
      'ETH',
      'privkey',
      privateKey,
    );

    const addressSavePromise = this.saveAddress(userApi, address);

    await Promise.all([mnemonicPromise, privateKeyPromise, addressSavePromise]);

    return address;
  }

  private async saveAddress(userApi: UserApi, ethAddress: string) {
    const ethBlockNumAtCreation = await this.web3.eth.getBlockNumber();
    const updateResult = await userApi.setWalletAccountToUser(
      ethAddress,
      ethBlockNumAtCreation,
    );
    return updateResult;
  }

  protected getPrivateKey(userId: string) {
    return credentialService.get(userId, 'ETH', 'privkey');
  }

  public async estimateFee() {
    const web3GasPrice = await this.web3.eth.getGasPrice();
    const gasPrice = new BigNumber(web3GasPrice);
    const feeEstimate = gasPrice.multipliedBy(21001);
    return this.toEther(feeEstimate).toFixed();
  }

  async getBalance(userApi: UserApi) {
    const ethAddress = await this.ensureEthAddress(userApi);
    const balance = await this.web3.eth.getBalance(ethAddress);
    const feeEstimate = +(await this.estimateFee());
    return {
      accountId: userApi.userId,
      symbol: this.symbol,
      name: this.name,
      receiveAddress: ethAddress,
      feeEstimate: feeEstimate.toString(),
      balance: {
        unconfirmed: '0',
        confirmed: this.toEther(new BigNumber(balance)).toFixed(),
      },
    };
  }

  protected async ensureEthAddress(userApi: UserApi) {
    const { id, wallet = { ethAddress: '' } } = await userApi.findFromDb();
    let { ethAddress } = wallet;
    if (!ethAddress) {
      const privateKey = await this.getPrivateKey(id).catch(() => null);
      if (privateKey) {
        const { address } = this.web3.eth.accounts.privateKeyToAccount(
          privateKey,
        );
        if (address) {
          await this.saveAddress(userApi, address);
          ethAddress = address;
        } else {
          throw new Error('Error setting/retreving address');
        }
      } else {
        ethAddress = await this.createAccount(userApi);
      }
    }
    return ethAddress;
  }

  async getTransactions(userApi: UserApi): Promise<ITransaction[]> {
    const ethAddress = await this.ensureEthAddress(userApi);
    const transactions = await ethService.getEthTransactions(ethAddress);
    return this.formatTransactions(transactions, ethAddress);
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
        value: this.toWei(new BigNumber(amount)),
        gas: gas,
        nonce,
        data,
      },
      privateKey,
    );
    return rawTransaction;
  }

  async send(userApi: UserApi, to: string, amount: string) {
    try {
      const ethAddress = await this.ensureEthAddress(userApi);
      const privateKey = await this.getPrivateKey(userApi.userId);
      const rawTransaction = await this.signTransaction(
        ethAddress,
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

  protected toEther(wei: BigNumber): BigNumber {
    return wei.multipliedBy(new BigNumber(10).pow(new BigNumber(18).negated()));
  }

  protected toWei(ether: BigNumber): BigNumber {
    return ether.multipliedBy(new BigNumber(10).pow(new BigNumber(18)));
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
        to,
        from,
        value,
      } = rawTx;
      const gasUsed = new BigNumber(rawTx.gasUsed);
      const gasPrice = new BigNumber(rawTx.gasPrice);
      const fee = gasUsed.multipliedBy(gasPrice);
      return {
        id: hash,
        status: blockNumber !== null ? 'Complete' : 'Pending',
        confirmations: +confirmations,
        timestamp: +timeStamp,
        fee: this.toEther(fee).toFixed(),
        link: `${config.ethTxLink}/${hash}`,
        to: to,
        from: from,
        type: to === address.toLowerCase() ? 'Deposit' : 'Withdrawal',
        amount: this.toEther(new BigNumber(value)).toFixed(),
      };
    });
  }
}

export default EthAPI;
