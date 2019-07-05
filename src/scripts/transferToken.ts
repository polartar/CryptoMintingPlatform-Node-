// require('dotenv').config();
// import config from '../common/config';
// import * as ethers from 'ethers';
// import * as ethereumUtil from 'ethereumjs-util';
// import { ICoinMetadata } from '../types';
// import { BigNumber } from 'bignumber.js';
// import credentials from '../../credentials';
// const ethereumTx = require('ethereumjs-tx');
// import CoinConfig from '../common/CoinsSupported';
// import autoBind = require('auto-bind');
// const Web3 = require('web3');

// interface IAccountKeys {
//   sender: string;
//   pkey: string;
// }

// interface ISendStuff {
//   toAddress: string;
//   value: string | number;
//   nonce: number;
// }

// class TokenTransferer {
//   abi: any;
//   contractAddress: string;
//   senderAddress: string;
//   senderPkey: string;
//   decimals: number;
//   web3: any = new Web3(config.ethNodeUrl);
//   contract: any;

//   constructor(metadata: ICoinMetadata, keys: IAccountKeys) {
//     autoBind(this);
//     const { abi, contractAddress, decimalPlaces } = metadata;
//     const { sender, pkey } = keys;
//     this.abi = abi;
//     this.contractAddress = contractAddress;
//     this.senderAddress = sender;
//     this.senderPkey = pkey;
//     this.decimals = decimalPlaces;
//     this.contract = new this.web3.eth.Contract(abi, contractAddress, {
//       from: sender,
//     });
//   }

//   private async sendTransaction(
//     senderAddress: string,
//     privateKey: string,
//     contractAddress: string,
//     abiEncodedTxData: string,
//   ) {
//     let signedTransaction;

//     const rawTransaction = {
//       from: senderAddress,
//       nonce:
//         '0x' + new BigNumber(await this.getNonce(senderAddress) + 4).toString(16),
//       gasPrice: '0xBA43B7400',
//       gasLimit: 4000000,
//       to: contractAddress,
//       value: '0x0',
//       data: abiEncodedTxData,
//     };

//     const privKey = ethereumUtil.toBuffer(`0x${privateKey}`);
//     const tx = new ethereumTx(rawTransaction);

//     tx.sign(privKey);
//     const serializedTx = tx.serialize();

//     try {
//       signedTransaction = await this.web3.eth.sendSignedTransaction(
//         '0x' + serializedTx.toString('hex'),
//         (err: any, result: any) => {
//           console.log(err)
//           console.log(result)
//           return Promise.resolve(result)
//         }
//       );
//       console.log(signedTransaction);
//     } catch (err) {
//       throw err;
//     }

//     return signedTransaction;
//   }

//   public async getNonce(address: string) {
//     try {
//       const count = await this.web3.eth.getTransactionCount(address);
//       return count;
//     } catch (error) {
//       console.log(error);
//       throw new Error(error);
//     }
//   }

//   private integerize(decimalizedString: string) {
//     const tenToPowOfDecimals = new BigNumber(10).pow(
//       new BigNumber(this.decimals),
//     );
//     const value = new BigNumber(decimalizedString).multipliedBy(
//       tenToPowOfDecimals,
//     );
//     const hexAmount = `0x${value.toString(16)}`;
//     return ethers.utils.bigNumberify(hexAmount);
//   }

//   async sendTokens(to: string, value: string) {
//     const intValue = ethers.utils.bigNumberify(this.integerize(value).toString());
//     const abiEncodedSendValues = this.contract.methods
//       .transfer(to, intValue)
//       .encodeABI();

//     let distributeMinting;
//     try {
//       distributeMinting = await this.sendTransaction(
//         this.senderAddress,
//         this.senderPkey,
//         this.contractAddress,
//         abiEncodedSendValues,
//       );
//     } catch (err) {
//       if (
//         err &&
//         err.message &&
//         err.message
//           .toLowerCase()
//           .indexOf('be aware that it might still be mined') >= 0
//       ) {
//         console.error(err.stack);
//         return true;
//       }
//       throw err;
//     }

//     return distributeMinting;
//   }
// }

// (async () => {
//   const {
//     erc20sEnv: [green, arcade],
//   } = new CoinConfig();

//   const keys: IAccountKeys = {
//     sender: '0xDBC893938cC4e7B2B4049dB86E16204fc394797f',
//     pkey: '9c6107a7dbffc00381a2e09bbcc158efc6ff5c642ac2c160ec82c50849d9aac3'
//   }

//   const toAddress = '0x485Aff1d0D6947C009e43e7caE487dD596409dA3';
//   const amountToSend = '500'

//   const arcadeSender = new TokenTransferer(arcade.dev, keys);

//   try {

//     const arcadeResults = await arcadeSender.sendTokens(toAddress, amountToSend);
//     console.log("LOG: arcadeResults", arcadeResults)
//   } catch (error) {
//     console.log(error.stack);
//   }
// })();
