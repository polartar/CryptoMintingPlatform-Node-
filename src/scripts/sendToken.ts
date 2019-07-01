require('dotenv').config();
import config from '../common/config';
import * as ethers from 'ethers';
import * as ethereumUtil from 'ethereumjs-util';
import { ICoinMetadata } from '../types';
import { BigNumber } from 'bignumber.js';
import credentials from '../../credentials';
const ethereumTx = require('ethereumjs-tx');
import CoinConfig from '../common/CoinsSupported';
import autoBind = require('auto-bind');
const Web3 = require('web3');

interface IAccountKeys {
  owner: string;
  pkey: string;
}

interface ISendStuff {
  toAddress: string;
  value: string | number;
  nonce: number;
}

class TokenMinter {
  abi: any;
  contractAddress: string;
  ownerAddress: string;
  ownerPkey: string;
  decimals: number;
  web3: any = new Web3(config.ethNodeUrl);
  contract: any;

  constructor(metadata: ICoinMetadata, keys: IAccountKeys) {
    autoBind(this);
    const { abi, contractAddress, decimalPlaces } = metadata;
    const { owner, pkey } = keys;
    this.abi = abi;
    this.contractAddress = contractAddress;
    this.ownerAddress = owner;
    this.ownerPkey = pkey;
    this.decimals = decimalPlaces;
    this.contract = new this.web3.eth.Contract(abi, contractAddress, {
      from: owner,
    });
  }

  private async sendTransaction(
    ownerAddress: string,
    privateKey: string,
    contractAddress: string,
    abiEncodedTxData: string,
  ) {
    let signedTransaction;

    const rawTransaction = {
      from: ownerAddress,
      nonce:
        '0x' + new BigNumber(await this.getNonce(ownerAddress)).toString(16),
      gasPrice: '0xBA43B7400',
      gasLimit: 4000000,
      to: contractAddress,
      value: '0x0',
      data: abiEncodedTxData,
    };

    const privKey = ethereumUtil.toBuffer(`0x${privateKey}`);
    const tx = new ethereumTx(rawTransaction);

    tx.sign(privKey);
    const serializedTx = tx.serialize();

    try {
      signedTransaction = await this.web3.eth.sendSignedTransaction(
        '0x' + serializedTx.toString('hex'),
      );
      console.log(signedTransaction);
    } catch (err) {
      throw err;
    }

    return signedTransaction;
  }

  public async getNonce(address: string) {
    try {
      const count = await this.web3.eth.getTransactionCount(address);
      return count;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  private integerize(decimalizedString: string) {
    const tenToPowOfDecimals = new BigNumber(10).pow(
      new BigNumber(this.decimals),
    );
    const value = new BigNumber(decimalizedString).multipliedBy(
      tenToPowOfDecimals,
    );
    const hexAmount = `0x${value.toString(16)}`;
    return ethers.utils.bigNumberify(hexAmount);
  }

  async distributeTokens(distValues: string[], distAddresses: string[]) {
    const formattedDistValues = distValues.map(this.integerize);

    const abiEncodedSendValues = this.contract.methods
      .distributeMinting(distAddresses, formattedDistValues)
      .encodeABI();

    let distributeMinting;
    try {
      distributeMinting = await this.sendTransaction(
        this.ownerAddress,
        this.ownerPkey,
        this.contractAddress,
        abiEncodedSendValues,
      );
    } catch (err) {
      if (
        err &&
        err.message &&
        err.message
          .toLowerCase()
          .indexOf('be aware that it might still be mined') >= 0
      ) {
        console.error(err.stack);
        return true;
      }
      throw err;
    }

    return distributeMinting;
  }
}

function getRandomValue(numConfig: { min: number; max: number }) {
  const { min, max } = numConfig;
  return Math.random() * (+max - +min) + +min;
}

(async () => {
  const {
    erc20sEnv: [green, arcade],
  } = new CoinConfig();
  const { green: greenCredentials, arcade: arcadeCredentials } = credentials;

  // Send specific amounts
  const specificAmounts: string[] = [];
  const distConfig = {
    min: 10,
    max: 1000,
    volume: 50,
  };
  // OR: get a bunch of random amounts based on the config above.
  const randomAmounts: string[] = new Array(distConfig.volume)
    .fill(0)
    .map(() => getRandomValue(distConfig).toFixed(4));
  // If specific amounts is empty use the randomAmounts array.
  const amounts = specificAmounts.length ? specificAmounts : randomAmounts;

  // Send transactions to a list of specific addresses.
  const toAddresses: string[] = [];
  // OR: Send all transactions to one address;
  const toAddress = '';

  // If specific addresses aren't specify, repeat the single address to match the length of amounts.
  const addresses = toAddresses.length
    ? toAddresses
    : new Array(amounts.length).fill(toAddress);
  if (addresses.length !== amounts.length)
    throw new Error('Address and amounts array length must match');

  const arcadeSender = new TokenMinter(arcade.dev, arcadeCredentials);
  const greenSender = new TokenMinter(green.dev, greenCredentials);

  try {
    const [greenResults, arcadeResults] = await Promise.all([
      greenSender.distributeTokens(amounts, addresses),
      arcadeSender.distributeTokens(amounts, addresses),
    ]);
    console.log(greenResults, arcadeResults);
  } catch (error) {
    console.log(error.stack);
  }
})();
