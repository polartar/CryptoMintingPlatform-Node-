import { ServerToServerService } from './server-to-server';
import ethers = require('ethers');
import { UniswapPair, ETH, TradeContext } from 'simple-uniswap-sdk';
import { config, logger } from '../common';

const ETHEREUM_NODE_URL = config.ethNodeUrl;
const chainId = config.chainId;

let network: string;
if (chainId === 1) {
  network = ETH.MAINNET().contractAddress.toLowerCase();
} else if (chainId === 3) {
  network = ETH.ROPSTEN().contractAddress.toLowerCase();
}

class StartSwap extends ServerToServerService {
  public confirmSwap = async (
    decryptedString: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    receiveAddress: string,
  ) => {
    try {
      if (!network.includes(inputToken) && !network.includes(outputToken)) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
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
          throw new Error(
            'You do not have enough from balance to execute this swap',
          );
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
        } = await this.firmAndSendSwap(trade, wallet);

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
      }

      if (network.includes(inputToken) && !network.includes(outputToken)) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
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
          throw new Error(
            'You do not have enough from balance to execute this swap',
          );
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
        } = await this.firmAndSendSwap(trade, wallet);

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
      }

      if (network.includes(outputToken) && !network.includes(inputToken)) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
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
          throw new Error(
            'You do not have enough from balance to execute this swap',
          );
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
        } = await this.firmAndSendSwap(trade, wallet);

        return {
          message: 'Success',
          hash,
          blockNumber: blockNumber,
          confirmations,
          to,
          midPrice: minAmountConvertQuote,
          midPriceInverted: expectedConvertQuote,
          path: routeText,
          liquidityProviderFee,
          liquidityProviderFeePercent,
          tradeExpires,
        };
      }
    } catch (error) {
      logger.warn('Failed to get service from swap:' + error);
      return {
        message: error,
      };
    }
  };
  private firmAndSendSwap = async (
    swap: TradeContext,
    wallet: ethers.ethers.Wallet,
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
      const tradeTransaction = await wallet.sendTransaction(swap.transaction);
      const hash: string = tradeTransaction.hash;
      const value: number = tradeTransaction.value.toNumber();
      console.log('trade txHash', tradeTransaction.hash);
      const tradeReceipt = await tradeTransaction.wait();
      console.log('trade receipt', tradeReceipt);
      const blockNumber: number = tradeReceipt.blockNumber;
      const confirmations: number = tradeReceipt.confirmations;
      const to: string = tradeReceipt.to;
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
    try {
      if (!network.includes(outputToken) && !network.includes(inputToken)) {
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
        };
      }

      if (!network.includes(outputToken) && network.includes(inputToken)) {
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
        };
      }

      if (network.includes(outputToken) && !network.includes(inputToken)) {
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
        };
      }
    } catch (error) {
      throw new Error(error);
    }
  };
}

export const startSwap = new StartSwap();
