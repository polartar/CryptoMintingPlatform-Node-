import { ServerToServerService } from './server-to-server';
import ethers = require('ethers');
import { UniswapPair, ETH, TradeContext } from 'simple-uniswap-sdk';
import { config, logger } from '../common';

const ETHEREUM_NODE_URL = config.ethNodeUrl;
const chainId = config.chainId;

class StartSwap extends ServerToServerService {
  public confirmSwap = async (
    decryptedString: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    receiveAddress: string,
  ) => {
    try {
      if (
        inputToken !== ETH.MAINNET().contractAddress &&
        outputToken !== ETH.MAINNET().contractAddress
      ) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
          inputToken,
          outputToken,
          amount,
          receiveAddress,
        );

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

        return this.firmAndSendSwap(trade, wallet);
      }

      if (
        inputToken === ETH.MAINNET().contractAddress &&
        outputToken !== ETH.MAINNET().contractAddress
      ) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
          inputToken,
          outputToken,
          amount,
          receiveAddress,
        );

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

        return this.firmAndSendSwap(trade, wallet);
      }

      if (
        outputToken === ETH.MAINNET().contractAddress &&
        inputToken !== ETH.MAINNET().contractAddress
      ) {
        const { trade, uniswapPairFactory, message } = await this.uniswapSwap(
          inputToken,
          outputToken,
          amount,
          receiveAddress,
        );

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

        return this.firmAndSendSwap(trade, wallet);
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
    try {
      if (swap.approvalTransaction) {
        const approved = await wallet.sendTransaction(swap.approvalTransaction);
        console.log('approved txHash', approved.hash);
        const approvedReceipt = await approved.wait();
        console.log('approved receipt', approvedReceipt);
      }

      const tradeTransaction = await wallet.sendTransaction(swap.transaction);
      console.log('trade txHash', tradeTransaction.hash);
      const tradeReceipt = await tradeTransaction.wait();
      console.log('trade receipt', tradeReceipt);

      swap.destroy();

      return {
        message: 'Success',
      };
    } catch (error) {
      return error;
    }
  };

  public uniswapSwap = async (
    inputToken: string,
    outputToken: string,
    amount: string,
    receiveAddress: string,
  ) => {
    try {
      if (
        inputToken !== ETH.MAINNET().contractAddress &&
        outputToken !== ETH.MAINNET().contractAddress
      ) {
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

      if (
        inputToken === ETH.MAINNET().contractAddress &&
        outputToken !== ETH.MAINNET().contractAddress
      ) {
        const uniswapPair = new UniswapPair({
          fromTokenContractAddress: ETH.MAINNET().contractAddress,
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

      if (
        outputToken === ETH.MAINNET().contractAddress &&
        inputToken !== ETH.MAINNET().contractAddress
      ) {
        const uniswapPair = new UniswapPair({
          fromTokenContractAddress: inputToken,
          toTokenContractAddress: ETH.MAINNET().contractAddress,
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
