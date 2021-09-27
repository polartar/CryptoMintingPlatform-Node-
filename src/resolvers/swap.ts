import { startSwap } from '../services/swap';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { logger, config } from 'src/common';
import EthWallet from '../wallet-api/coin-wallets/eth-wallet';

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
      coinSymbol: string;
      amount: string;
      inputToken: string;
      outputToken: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.maybeRequireStrongWalletPassword(args.walletPassword);
    const walletApi = wallet.coin(args.coinSymbol) as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

    const validPassword = await walletApi.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) throw new Error('Invalid Password');

    let passwordDecripted: string;
    try {
      const encryptedKey = await walletApi.getEncryptedPrivKey(user.userId);
      const decryptedPrivateKey = this.decrypt(
        encryptedKey,
        args.walletPassword,
      );
      const { decryptedString } = decryptedPrivateKey;
      passwordDecripted = decryptedString;
    } catch (e) {
      logger.warn('EncryptedKey no return instead we reach a 401 status' + e);
    }

    // passwordDecripted = "wait size angle field door focus mansion shove flame concert pool can";

    try {
      const confirmTrade = await startSwap.confirmSwap(
        passwordDecripted,
        args.inputToken,
        args.outputToken,
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
      coinSymbol: string;
      amount: string;
      inputToken: string;
      outputToken: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    const walletApi = wallet.coin(args.coinSymbol) as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

    try {
      const { trade, message } = await startSwap.uniswapSwap(
        args.inputToken,
        args.outputToken,
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
