import Db from './db';
import { User } from '../models';
import config from '../common/config';
import * as ethers from 'ethers';
import * as ethereumUtil from 'ethereumjs-util';
import { DataSource } from 'apollo-datasource';
import WalletBase from './wallet-base';
import EthApi from './eth-wallet';
import { IAccount } from '../models/account';
const Web3 = require('web3');
import { ITransaction } from '../types';
import { BigNumber } from 'bignumber.js';
import { AnyARecord } from 'dns';
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
            amount: amount.toString(),
          };
        }),
    );
  }

  // web3
  async getTransactions(userAccount: IAccount): Promise<ITransaction[]> {
    const { ethAddress, ethBlockNumAtCreation } = userAccount;
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

  private integerIze(numOrHex: string | number) {
    const tokenBN = new BigNumber(numOrHex);
    const ten = new BigNumber(10);
    const decPlaces = new BigNumber(this.decimalPlaces);
    const tenToDecPlaces = ten.pow(decPlaces);
    return tokenBN.multipliedBy(tenToDecPlaces);
  }

  async getBalance(userAccount: IAccount) {
    const { ethAddress, id: accountId } = userAccount;
    let userAddress = ethAddress;
    if (!ethAddress) {
      userAddress = await this.createAccount(accountId);
    }
    const rawBalance = await this.contract.methods
      .balanceOf(userAddress)
      .call();
    const balance = this.decimalize(rawBalance);
    const feeEstimate = await this.estimateFee();
    return {
      accountId,
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

  async send(userAccount: IAccount, to: string, amount: string) {
    const { erc20FeeCalcAddress } = config;
    const { ethAddress, id: accountId } = userAccount;
    const { toHex } = this.web3.utils;
    const value = +amount * Math.pow(10, +this.decimalPlaces);
    const sendValue = ethers.utils.bigNumberify(`0x${value.toString(16)}`);
    const count = await this.web3.eth.getTransactionCount(ethAddress);
    const privateKey = await this.getPrivateKey(accountId);
    const gasRequired = await this.contract.methods
      .transfer(erc20FeeCalcAddress, 100000000)
      .estimateGas({ from: erc20FeeCalcAddress });
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
