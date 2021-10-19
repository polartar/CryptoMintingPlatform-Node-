import { startSwap } from '../services/swap';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { logger, config } from 'src/common';
import Erc20API from 'src/wallet-api/coin-wallets/erc20-wallet';

class SwapResolvers extends ResolverBase {
  getSwapParams = async (
    parent: any,
    { coinSymbol }: { coinSymbol?: string },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    try {
      if (coinSymbol) {
        const walletApi = wallet.coin(coinSymbol);
        const walletResult = await walletApi.getWalletInfo(user);
        return [walletResult];
      }
      const { allCoins } = wallet;
      const walletData = await Promise.all(
        allCoins.map(walletCoinApi => walletCoinApi.getWalletInfo(user)),
      );
      return [walletData];
    } catch (error) {
      logger.warn(`resolvers.swap.getSwapParams.catch: ${error}`);
      throw error;
    }
  };

  getBalance = async (parent: any, args: {}, { user, wallet }: Context) => {
    this.requireAuth(user);
    try {
      const walletApi = wallet.coin(parent.symbol);
      const walletResult = await walletApi.getBalance(
        parent.lookupTransactionsBy,
      );
      return walletResult;
    } catch (error) {
      logger.debug(`resolvers.swap.getBalance.catch: ${error}`);
      throw error;
    }
  };

  confirmSwap = async (
    parent: any,
    args: {
      coinSymbol0: string;
      coinSymbol1: string;
      amount: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.maybeRequireStrongWalletPassword(args.walletPassword);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const outputToken = wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    const validPassword = await inputToken.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) throw new Error('Invalid Password');

    let passwordDecripted: string;
    try {
      const encryptedKey = await inputToken.getEncryptedPrivKey(user.userId);
      const decryptedPrivateKey = this.decrypt(
        encryptedKey,
        args.walletPassword,
      );
      const { decryptedString } = decryptedPrivateKey;
      passwordDecripted = decryptedString;
    } catch (e) {
      logger.warn('EncryptedKey no return instead we reach a 401 status' + e);
    }

    try {
      const confirmTrade = await startSwap.confirmSwap(
        passwordDecripted,
        token0,
        token1,
        args.amount,
        receiveAddress,
      );
      return confirmTrade;
    } catch (error) {
      logger.warn(`resolvers.Swap.startSwap.catch: ${error}`);
    }
  };

  startSwap = async (
    parent: any,
    args: {
      coinSymbol0: string;
      coinSymbol1: string;
      amount: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const inputToken = wallet.coin(args.coinSymbol0) as Erc20API;
    const token0 = inputToken.contractAddress;
    const outputToken = wallet.coin(args.coinSymbol1) as Erc20API;
    const token1 = outputToken.contractAddress;
    const { receiveAddress } = await inputToken.getWalletInfo(user);

    try {
      const { trade, message } = await startSwap.uniswapSwap(
        token0,
        token1,
        args.amount,
        receiveAddress,
      );

      if (message !== 'Success') {
        throw new Error('Swap is not available');
      }

      const {
        minAmountConvertQuote,
        expectedConvertQuote,
        routeText,
        liquidityProviderFee,
        liquidityProviderFeePercent,
        tradeExpires,
      } = trade;

      return {
        message,
        midPrice: minAmountConvertQuote,
        midPriceInverted: expectedConvertQuote,
        path: routeText,
        liquidityProviderFee,
        liquidityProviderFeePercent,
        tradeExpires,
      };
    } catch (error) {
      logger.warn(`resolvers.Swap.startSwap.catch: ${error}`);
      return {
        message: error,
      };
    }
  };
}

export const swapResolver = new SwapResolvers();

export default {
  Query: {
    swapParams: swapResolver.getSwapParams,
  },

  Tokens: {
    balance: swapResolver.getBalance,
  },

  Mutation: {
    startSwap: swapResolver.startSwap,
    confirmSwap: swapResolver.confirmSwap,
  },
};
