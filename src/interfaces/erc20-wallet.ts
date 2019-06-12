import config from '../common/config';
import * as ethers from 'ethers';
import * as ethereumUtil from 'ethereumjs-util';
import EthApi from './eth-wallet';
const Web3 = require('web3');
import { ITransaction } from '../types';
import { BigNumber } from 'bignumber.js';
import { UserApi } from '../data-sources';
const ethereumTx = require('ethereumjs-tx');

interface ITransferEvent {
  address: string;
  blockHash: string;
  blockNumber: number;
  event: string;
  id: string;
  logIndex: number;
  raw: any;
  removed: boolean;
  returnValues: {
    from: string;
    to: string;
    tokens: any;
    0: number;
    1: number;
    2: BigNumber;
  };
  signature: string;
  transactionHash: string;
  transactionIndex: number;
}

class Erc20API extends EthApi {
  contract: any;
  decimalPlaces: number;
  web3 = new Web3(config.ethNodeUrl);
  constructor(
    name: string,
    symbol: string,
    contract: string,
    abi: any,
    backgroundColor: string,
    icon: string,
    decimalPlaces: number,
  ) {
    super(name, symbol, contract, abi, backgroundColor, icon);
    this.contract = new this.web3.eth.Contract(abi, contract);
    this.decimalPlaces = decimalPlaces;
  }

  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';

  async estimateFee() {
    const { erc20FeeCalcAddress } = config;
    const gasRequired = await this.contract.methods
      .transfer(erc20FeeCalcAddress, 100000000)
      .estimateGas({ from: erc20FeeCalcAddress });
    const gasPrice = 0xee6b2800;
    const feeEstimate = gasPrice * gasRequired;
    return this.toEther(feeEstimate);
  }

  private calculateFeeFromGas(gasPrice: string, gas: number) {
    const price = new BigNumber(gasPrice);
    const gasUsed = new BigNumber(gas);
    const fee = price.multipliedBy(gasUsed);
    return this.toEther(fee.toNumber());
  }

  private async transferEventsToTransactions(
    transferEvents: ITransferEvent[],
    currentBlockNumber: number,
    userAddress: string,
  ): Promise<ITransaction[]> {
    return Promise.all(
      transferEvents
        .sort(
          (eventOne, eventTwo) => eventTwo.blockNumber - eventOne.blockNumber,
        )
        .map(async transferEvent => {
          const {
            transactionHash,
            blockNumber,
            blockHash,
            returnValues: { tokens, to, from },
          } = transferEvent;

          const amount = this.decimalize(tokens.toHexString());
          const block = await this.web3.eth.getBlock(blockNumber, false);
          const { timestamp } = block;
          const transaction = await this.web3.eth.getTransaction(
            transactionHash,
          );
          const { gasPrice, gas } = transaction;
          const fee = this.calculateFeeFromGas(gasPrice, gas);
          return {
            id: transactionHash,
            status: blockHash ? 'Complete' : 'Pending',
            timestamp,
            confirmations: currentBlockNumber - blockNumber,
            fee: fee.toString(),
            link: `${config.ethTxLink}/${transactionHash}`,
            to,
            from,
            type: to === userAddress ? 'Deposit' : 'Withdrawal',
            amount: new BigNumber(amount).toFixed(),
          };
        }),
    );
  }

  // web3
  async getTransactions(userApi: UserApi): Promise<ITransaction[]> {
    const ethAddress = await this.ensureEthAddress(userApi);
    const currentBlockNumber = await this.web3.eth.getBlockNumber();
    const sent = await this.contract.getPastEvents('Transfer', {
      fromBlock: 2426642,
      filter: {
        from: ethAddress,
      },
    });
    const received = await this.contract.getPastEvents('Transfer', {
      fromBlock: 2426642,
      filter: {
        to: ethAddress,
      },
    });
    const transactions = await this.transferEventsToTransactions(
      [...sent, ...received],
      currentBlockNumber,
      ethAddress,
    );
    return transactions;
  }

  private decimalize(numOrHex: string | number) {
    const tokenBN = new BigNumber(numOrHex);
    const ten = new BigNumber(10);
    const decPlaces = new BigNumber(this.decimalPlaces);
    const tenToDecPlaces = ten.pow(decPlaces.negated());
    return tokenBN.multipliedBy(tenToDecPlaces);
  }

  private integerize(numOrHex: string | number) {
    const tokenBN = new BigNumber(numOrHex);
    const ten = new BigNumber(10);
    const decPlaces = new BigNumber(this.decimalPlaces);
    const tenToDecPlaces = ten.pow(decPlaces);
    return tokenBN.multipliedBy(tenToDecPlaces);
  }

  async getBalance(userApi: UserApi) {
    const ethAddress = await this.ensureEthAddress(userApi);
    const rawBalance = await this.contract.methods.balanceOf(ethAddress).call();
    const balance = this.decimalize(rawBalance);
    const feeEstimate = await this.estimateFee();
    return {
      accountId: userApi.userId,
      symbol: this.symbol,
      name: this.name,
      feeEstimate: feeEstimate.toString(),
      receiveAddress: ethAddress,
      balance: {
        confirmed: balance.toString(),
        unconfirmed: '0',
      },
    };
  }

  async send(userApi: UserApi, to: string, amount: string) {
    const ethAddress = await this.ensureEthAddress(userApi);
    const value = this.integerize(amount);
    const sendValue = ethers.utils.bigNumberify(`0x${value.toString(16)}`);
    const count = await this.web3.eth.getTransactionCount(ethAddress);
    const privateKey = await this.getPrivateKey(userApi.userId);
    const nonce = `0x${count.toString(16)}`;

    const rawTransaction = {
      from: ethAddress,
      nonce: nonce,
      gasPrice: '0xEE6B2800',
      gasLimit: '0x250CA',
      to: this.contractAddress,
      value: '0x0',
      data: this.contract.methods.transfer(to, sendValue).encodeABI(),
    };
    const privKey = ethereumUtil.toBuffer(`0x${privateKey}`);
    const tx = new ethereumTx(rawTransaction);

    tx.sign(privKey);
    const serializedTx = tx.serialize();
    this.send;
    const signedTransaction = await this.sendSignedTransaction(
      `0x${serializedTx.toString('hex')}`,
    );

    return {
      success: true,
      message: signedTransaction.toString(),
    };
  }
}

export default Erc20API;
