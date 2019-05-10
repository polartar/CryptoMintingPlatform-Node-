import Db from './db';
import { User } from '../models';
import config from '../common/config';
import Web3 from 'web3';
import * as ethers from 'ethers';
import * as ethereumUtil from 'ethereumjs-util';
import { DataSource } from 'apollo-datasource';
import { WalletBase } from './base-wallet';
const ethereumTx = require('ethereumjs-tx');

class Erc20API extends WalletBase {
  model = User;

  constructor() {
    super();
  }

  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';

  // web3
  async getTransactions(
    contractAddress: string,
    accountAddress: string,
    decimalPlaces: string,
    abi: any,
  ) {
    const web3 = new Web3(config.ethNodeUrl);
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const contract = new web3.eth.Contract(abi, contractAddress);
    const transferEvents = await contract.getPastEvents('allEvents', {
      fromBlock: 2426642,
    });

    const transferObjects = transferEvents
      .filter(
        pastEvent =>
          pastEvent.returnValues._to === accountAddress ||
          pastEvent.returnValues._from === accountAddress,
      )
      .sort((eventOne, eventTwo) => eventTwo.blockNumber - eventOne.blockNumber)
      .map(
        async ({ blockNumber, transactionHash, returnValues, blockHash }) => {
          const { timestamp } = await web3.eth.getBlock(blockNumber, false);

          return {
            timestamp,
            transactionHash,
            confirmations: currentBlockNumber - blockNumber,
            amount: returnValues._value * Math.pow(10, +decimalPlaces * -1),
            status: blockHash ? 'success' : 'failed',
            blockNumber,
            type:
              returnValues._to === accountAddress ? 'deposit' : 'withdrawal',
            to: returnValues._to,
            from: returnValues._from,
          };
        },
      );

    return Promise.all(transferObjects)
      .then(results => {
        return results;
      })
      .catch(err => {
        throw new Error(err);
      });
  }

  async getBalance(
    contractAddress: string,
    accountAddress: string,
    decimalPlaces: number,
    abi: any,
  ) {
    const web3 = new Web3(config.ethNodeUrl);
    const contract = new web3.eth.Contract(abi, contractAddress);
    const balance = await contract.methods.balanceOf(accountAddress).call();
    return balance * Math.pow(10, +decimalPlaces * -1);
  }

  async sendToken(
    toAddress: string,
    accountAddress: string,
    value: number,
    privateKey: string,
    contractAddress: string,
    decimalPlaces: number,
    abi: any,
  ) {
    const web3 = new Web3(config.ethNodeUrl);
    const amount = value * Math.pow(10, +decimalPlaces);
    const string = amount.toLocaleString();
    const stringNoCommas = string.replace(/,/g, '');
    const sendValue = ethers.utils.bigNumberify(stringNoCommas);
    const count = await web3.eth.getTransactionCount(accountAddress);
    const contract = new web3.eth.Contract(abi, contractAddress, {
      from: accountAddress,
      // FIX THESE!
      gas: 10,
      gasPrice: '0x',
      data: 'dodl',
    });

    const rawTransaction = {
      from: accountAddress,
      nonce: '0x' + count.toString(16),
      gasPrice: '0x003B9ACA00',
      gasLimit: '0x250CA',
      to: contractAddress,
      value: '0x0',
      data: contract.methods.transfer(toAddress, sendValue).encodeABI(),
    };
    const privKey = ethereumUtil.toBuffer(`0x${privateKey}`); // Buffer not correct?
    const tx = new ethereumTx(rawTransaction);

    tx.sign(privKey);
    const serializedTx = tx.serialize();
    const signedTransaction = await web3.eth
      .sendSignedTransaction('0x' + serializedTx.toString('hex'))
      .catch(err => {
        if (err.message === this.WEB3_GAS_ERROR) {
          throw new Error(this.NEW_GAS_ERROR);
        }
      });
    return signedTransaction;
  }
}

export default Erc20API;
