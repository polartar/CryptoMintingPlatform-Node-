import config from '../common/config';
import * as ethers from 'ethers';
import * as ethereumUtil from 'ethereumjs-util';
import EthApi from './eth-wallet';
const Web3 = require('web3');
import { ITransaction, ICoinMetadata } from '../types';
import { BigNumber } from 'bignumber.js';
import { UserApi } from '../data-sources';
import { UserInputError } from 'apollo-server-express';
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

interface IRawTx {
  from: string;
  nonce: string;
  gasPrice: string;
  gasLimit: number;
  to: string;
  value: string;
  data: string;
}

class Erc20API extends EthApi {
  contract: any;
  decimalPlaces: number;
  web3 = new Web3(config.ethNodeUrl);
  abi: any;
  constructor(tokenMetadata: ICoinMetadata) {
    super(tokenMetadata);
    console.log(config.ethNodeUrl);
    const { abi, contractAddress, decimalPlaces } = tokenMetadata;
    if (!abi)
      throw new Error(
        'No abi provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!decimalPlaces || decimalPlaces < 0)
      throw new Error(
        'No decimalPlaces provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!contractAddress)
      throw new Error(
        'No contractAddress provided in token configuration for wallet interface. This parameter is required.',
      );

    this.contract = new this.web3.eth.Contract(abi, contractAddress);
    this.decimalPlaces = decimalPlaces;
    this.abi = abi;
  }

  WEB3_GAS_ERROR = 'Returned error: insufficient funds for gas * price + value';
  NEW_GAS_ERROR = 'Insufficient credits';

  async estimateFee() {
    // This code breaks on a newer contract.
    // const { erc20FeeCalcAddress } = config;
    // const gasRequired = await this.contract.methods
    //   .transfer(erc20FeeCalcAddress, 100000000)
    //   .estimateGas({ from: erc20FeeCalcAddress });
    // const gasPrice = new BigNumber(0xee6b2800);
    // const feeEstimate = gasPrice.multipliedBy(gasRequired);
    const feeEstimate = new BigNumber(0x8549cbe6b000);
    return this.toEther(feeEstimate).toFixed();
  }

  private calculateFeeFromGas(gasPrice: string, gas: number) {
    const price = new BigNumber(gasPrice);
    const gasUsed = new BigNumber(gas);
    const fee = price.multipliedBy(gasUsed);
    return this.toEther(fee);
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
          const isDeposit = to === userAddress;
          return {
            id: transactionHash,
            status: blockHash ? 'Complete' : 'Pending',
            timestamp,
            confirmations: currentBlockNumber - blockNumber,
            fee: isDeposit ? '0' : fee.negated().toString(),
            link: `${config.ethTxLink}/${transactionHash}`,
            to,
            from,
            type: isDeposit ? 'Deposit' : 'Withdrawal',
            amount: isDeposit ? amount.toFixed() : amount.negated().toFixed(),
            total: isDeposit
              ? amount.plus(fee).toFixed()
              : amount
                  .plus(fee)
                  .negated()
                  .toFixed(),
          };
        }),
    );
  }

  // web3
  async getTransactions(userApi: UserApi): Promise<ITransaction[]> {
    const { ethAddress } = await this.ensureEthAddress(userApi);
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

  private decimalize(numOrHex: string | number): BigNumber {
    const tokenBN = new BigNumber(numOrHex);
    const ten = new BigNumber(10);
    const decPlaces = new BigNumber(this.decimalPlaces);
    const tenToDecPlaces = ten.pow(decPlaces.negated());
    return tokenBN.multipliedBy(tenToDecPlaces);
  }

  private integerize(decimalizedString: string) {
    const tenToPowOfDecimals = new BigNumber(10).pow(
      new BigNumber(this.decimalPlaces),
    );
    const value = new BigNumber(decimalizedString).multipliedBy(
      tenToPowOfDecimals,
    );
    const hexAmount = `0x${value.toString(16)}`;
    return ethers.utils.bigNumberify(hexAmount);
  }

  private async getBalanceFromContract(ethAddress: string) {
    const balance = await this.contract.methods.balanceOf(ethAddress).call();
    return this.decimalize(balance);
  }

  async getBalance(userApi: UserApi) {
    const { ethAddress } = await this.ensureEthAddress(userApi);
    const balance = await this.getBalanceFromContract(ethAddress);
    const feeEstimate = await this.estimateFee();
    return {
      accountId: userApi.userId,
      symbol: this.symbol,
      name: this.name,
      backgroundColor: this.backgroundColor,
      icon: this.icon,
      feeEstimate: feeEstimate.toString(),
      receiveAddress: ethAddress,
      balance: {
        confirmed: balance.toFixed(),
        unconfirmed: '0',
      },
    };
  }

  // async send(userApi: UserApi, to: string, amount: string) {
  //   const nonce = 4;
  //   const { ethAddress } = await this.ensureEthAddress(userApi);
  //   const value = +amount * Math.pow(10, +this.decimalPlaces);
  //   const string = value.toLocaleString().replace(/,/g, '');
  //   const sendValue = ethers.utils.bigNumberify(string);
  //   const privateKey = await this.getPrivateKey(userApi.userId);
  //   const gas = this.web3.utils.toWei('3', 'gwei');
  //   const gasPrice = new BigNumber(gas).toString(16);
  //   const rawTransaction = {
  //     from: ethAddress,
  //     nonce: `0x${nonce.toString(16)}`,
  //     gasPrice: '0x' + gasPrice,
  //     gasLimit: '0x250CA',
  //     to: this.contractAddress,
  //     value: '0x0',
  //     data: this.contract.methods.transfer(to, sendValue).encodeABI(),
  //   };
  //   const privKey = ethereumUtil.toBuffer(`0x${privateKey}`); // Buffer not correct?
  //   const tx = new ethereumTx(rawTransaction);

  //   tx.sign(privKey);
  //   const serializedTx = tx.serialize();
  //   const hexedString = `0x${serializedTx.toString('hex')}`;
  //   this.web3.eth.sendSignedTransaction(
  //     hexedString,
  //     (err: Error, result: any) => {
  //       console.log({ err });
  //       console.log({ result });
  //     },
  //   );
  //   return {
  //     success: true,
  //     message: 'kdkd',
  //   };
  // }

  private async sendTransaction(rawTx: IRawTx, privateKey: string) {
    const privKey = ethereumUtil.toBuffer(`0x${privateKey}`);
    const tx = new ethereumTx(rawTx);
    tx.sign(privKey);
    const serializedTx = `0x${tx.serialize().toString('hex')}`;
    const sentTx = await this.web3.eth.sendSignedTransaction(
      serializedTx,
      (err: any, result: any) => {
        console.log(err);
        console.log(result);
      },
    );
    return sentTx;
  }

  // public async getNonce(address: string) {
  //   try {
  //     const count = await this.web3.eth.getTransactionCount(address);
  //     return count;
  //   } catch (error) {
  //     console.log(error);
  //     throw new Error(error);
  //   }
  // }

  async send(userApi: UserApi, to: string, value: string) {
    const { ethAddress, nonce } = await this.ensureEthAddress(userApi);
    const privateKey = await this.getPrivateKey(userApi.userId);
    const amount = this.integerize(value);
    const abiEncodedTxData = this.contract.methods
      .transfer(to, amount)
      .encodeABI();

    const rawTransaction: IRawTx = {
      from: ethAddress,
      nonce: '0x' + new BigNumber(nonce).toString(16),
      gasPrice: '0xBA43B7400',
      gasLimit: 4000000,
      to: this.contractAddress,
      value: '0x0',
      data: abiEncodedTxData,
    };
    try {
      const txHash = await this.sendTransaction(rawTransaction, privateKey);
      await userApi.incrementTxCount();
      return {
        success: true,
        message: txHash,
      };
    } catch (err) {
      // if (
      //   err &&
      //   err.message &&
      //   err.message
      //     .toLowerCase()
      //     .indexOf('be aware that it might still be mined') >= 0
      // ) {
      //   console.error(err.stack);
      //   return true;
      // }
      throw err;
    }
  }
}

export default Erc20API;
