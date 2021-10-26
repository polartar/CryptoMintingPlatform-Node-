import { ServerToServerService } from './server-to-server';
import ethers = require('ethers');
import { UniswapPair, ETH, TradeContext } from 'simple-uniswap-sdk';
import * as IUniswapV2Router from 'simple-uniswap-sdk/dist/esm/ABI/uniswap-router-v2.json';
import { config, logger } from '../common';
import { IWalletTransaction, TransactionType } from 'src/types';
import { WalletTransaction } from 'src/models';
import { BigNumber, utils } from 'ethers';

const ETHEREUM_NODE_URL = config.ethNodeUrl;
const chainId = config.chainId;

let network: string;
if (chainId === 1) {
  network = ETH.MAINNET().contractAddress;
} else if (chainId === 3) {
  network = ETH.ROPSTEN().contractAddress;
}

class StartSwap extends ServerToServerService {
  uniswapV2RouterInterface = new utils.Interface(IUniswapV2Router);
  storeDecimalsFungible = 8;
  TYPE_NF_BIT = BigInt(1) << BigInt(255);
  NF_INDEX_MASK = BigInt(~0) << BigInt(128);

  private isNonFungible = (tokenId: string) => {
    return (BigInt(tokenId) & this.TYPE_NF_BIT) === this.TYPE_NF_BIT;
  };

  public confirmSwap = async (
    decryptedString: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    receiveAddress: string,
  ) => {
    try {
      const {
        trade,
        uniswapPairFactory,
        message,
        functionName,
      } = await this.uniswapSwap(
        inputToken,
        outputToken,
        amount,
        receiveAddress,
      );

      const {
        minAmountConvertQuote,
        expectedConvertQuote,
        routeText,
        liquidityProviderFee,
        liquidityProviderFeePercent,
        tradeExpires,
      } = trade;

      if (message !== 'Success') {
        throw new Error(message);
      }

      if (!trade.fromBalance.hasEnough) {
        throw new Error('You do not enough balance to execute this swap');
      }

      const provider = new ethers.providers.JsonRpcProvider(
        uniswapPairFactory.providerUrl,
      );

      const wallet = new ethers.Wallet(decryptedString, provider);
      const {
        hash,
        blockNumber,
        confirmations,
        to,
      } = await this.firmAndSendSwap(trade, wallet, functionName);

      return {
        message: 'Success',
        hash,
        blockNumber,
        confirmations,
        to,
        midPrice: minAmountConvertQuote,
        midPriceInverted: expectedConvertQuote,
        path: routeText,
        liquidityProviderFee,
        liquidityProviderFeePercent,
        tradeExpires,
      };
    } catch (error) {
      return {
        message: error.message,
        hash: '',
        blockNumber: 0,
        confirmations: 0,
        to: '',
        midPrice: '',
        midPriceInverted: '',
        path: '',
        liquidityProviderFee: '',
        liquidityProviderFeePercent: 0,
        tradeExpires: 0,
      };
    }
  };

  saveToDatabase(tx: IWalletTransaction) {
    return WalletTransaction.create(tx);
  }

  private getIndexerId(
    txHash: string,
    type: TransactionType,
    logIndex?: number,
  ) {
    const logIndexString = logIndex >= 0 ? logIndex.toString() : '';

    return utils.sha256(utils.toUtf8Bytes(`${txHash}${type}${logIndexString}`));
  }

  private parseAmount = (
    tokenId: string,
    value: BigNumber,
    decimals: number,
  ) => {
    const sliceEnd = this.storeDecimalsFungible - decimals;
    const amountString = value.toString();
    const fullHexAmount = value.toHexString();
    const isNonFungible = this.isNonFungible(tokenId);
    const amount =
      !isNonFungible && sliceEnd < 0
        ? amountString.slice(0, sliceEnd)
        : amountString;
    return {
      amount,
      fullHexAmount,
      decimalsStored: isNonFungible ? 0 : this.storeDecimalsFungible,
    };
  };

  private getBaseType = (tokenId: string) => {
    if (this.isNonFungible(tokenId)) {
      const token = BigInt(tokenId);
      return '0x' + (token & this.NF_INDEX_MASK).toString(16);
    }
    return tokenId;
  };

  parseTokenId = (tokenId: string) => {
    return {
      tokenId,
      baseId: this.getBaseType(tokenId),
      nft: this.isNonFungible(tokenId),
    };
  };

  parseData = async (
    data: string,
    functionName: string,
    value?: any,
    toUserId?: string,
  ) => {
    const response = this.uniswapV2RouterInterface.decodeFunctionData(
      functionName,
      data,
    );
    return {
      from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      to: response.to,
      operator: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      fullHexAmount: value.toHexString(),
      logIndex: 0,
      contractMethod: functionName,
      mintTransaction: false,
    };
  };

  private firmAndSendSwap = async (
    swap: TradeContext,
    wallet: ethers.ethers.Wallet,
    functionName: string,
    toUserId?: string,
  ) => {
    if (swap.approvalTransaction) {
      try {
        const approved = await wallet.sendTransaction(swap.approvalTransaction);
        console.log('approved txHash', approved.hash);
        const approvedReceipt = await approved.wait();
        console.log('approved receipt', approvedReceipt);
      } catch (error) {
        throw new Error('Service.Swap.SartSwap.FirmAndSend.error' + error);
      }
    }

    try {
      const txResponse = await wallet.sendTransaction(swap.transaction);
      const { data, gasPrice, nonce } = txResponse;
      // const dataValues = await this.parseData(
      //   data,
      //   functionName,
      //   value,
      //   toUserId,
      // );
      console.log('trade txHash', txResponse.hash);
      const tradeReceipt = await txResponse.wait();
      console.log('trade receipt', tradeReceipt);
      const confirmations: number = tradeReceipt.confirmations;
      const to: string = tradeReceipt.to;
      const hash: string = txResponse.hash;
      const blockNumber: number = tradeReceipt.blockNumber;

      // const tx: IWalletTransaction = {
      //   indexerId: this.getIndexerId(hash, TransactionType.Erc1155, 0),
      //   type: TransactionType.Erc1155,
      //   contractName: 'Uniswap/Swap',
      //   status: blockNumber ? 'confirmed' : 'pending',
      //   timestamp: Math.floor(Date.now() / 1000),
      //   blockNumber: blockNumber || null,
      //   gasPriceHex: gasPrice.toHexString(),
      //   gasUsedHex: '',
      //   gasUsed: null,
      //   gasPrice: gasPrice.toString(),
      //   gasPriceDecimals: 18,
      //   hash,
      //   nonce,
      //   ...dataValues,
      // }

      // this.saveToDatabase(tx);

      swap.destroy();
      return {
        message: 'Success',
        hash,
        blockNumber,
        confirmations,
        to,
      };
    } catch (error) {
      throw new Error('Service.Swap.SartSwap.FirmAndSend.error' + error);
    }
  };

  public uniswapSwap = async (
    inputToken: string,
    outputToken: string,
    amount: string,
    receiveAddress: string,
  ) => {
    let functionName = '';
    const isOEth = network.toLowerCase().includes(outputToken);
    const isIEth = network.toLowerCase().includes(inputToken);

    if (isIEth) {
      functionName = 'swapExactETHForTokens';
      try {
        const uniswapPair = new UniswapPair({
          fromTokenContractAddress: network,
          toTokenContractAddress: outputToken,
          ethereumAddress: receiveAddress,
          chainId: chainId,
        });
        const uniswapPairFactory = await uniswapPair.createFactory();
        const trade = await uniswapPairFactory.trade(amount);

        return {
          message: 'Success',
          uniswapPair,
          uniswapPairFactory,
          trade,
          functionName,
        };
      } catch (error) {
        throw new Error(
          'Service.Swap.SartSwap.uniswapSwap.isIEth.error' + error,
        );
      }
    }

    if (isOEth) {
      functionName = 'swapExactTokensForETH';
      try {
        const uniswapPair = new UniswapPair({
          fromTokenContractAddress: inputToken,
          toTokenContractAddress: network,
          ethereumAddress: receiveAddress,
          chainId: chainId,
        });
        const uniswapPairFactory = await uniswapPair.createFactory();
        const trade = await uniswapPairFactory.trade(amount);

        return {
          message: 'Success',
          uniswapPair,
          uniswapPairFactory,
          trade,
          functionName,
        };
      } catch (error) {
        throw new Error(
          'Service.Swap.SartSwap.uniswapSwap.isOEth.error' + error,
        );
      }
    }

    functionName = 'swapExactTokensForTokens';
    try {
      const uniswapPair = new UniswapPair({
        fromTokenContractAddress: inputToken,
        toTokenContractAddress: outputToken,
        ethereumAddress: receiveAddress,
        chainId: chainId,
      });
      const uniswapPairFactory = await uniswapPair.createFactory();
      const trade = await uniswapPairFactory.trade(amount);

      return {
        message: 'Success',
        uniswapPair,
        uniswapPairFactory,
        trade,
        functionName,
      };
    } catch (error) {
      throw new Error('Service.Swap.SartSwap.uniswapSwap.Tokens.error' + error);
    }
  };
}

export const startSwap = new StartSwap();
