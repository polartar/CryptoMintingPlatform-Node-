import { startSwap } from '../services/swap';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ISwapToken } from '../types';
import { logger } from 'src/common';
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
      return walletData;
    } catch (error) {
      logger.warn(`resolvers.wallet.getWallet.catch: ${error}`);
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
      logger.debug(`resolvers.wallet.getBalance.catch: ${error}`);
      throw error;
    }
  };

  estimateFee = async (
    { symbol }: { symbol: string },
    args: any,
    { user, wallet }: Context,
  ) => {
    try {
      this.requireAuth(user);
      const walletApi = wallet.coin(symbol);
      const feeEstimate = await walletApi.estimateFee(user);
      return feeEstimate;
    } catch (error) {
      logger.warn(`resolvers.wallet.estimateFee.catch: ${error}`);
      throw error;
    }
  };

  confirmSwap = async (
    parent: any,
    args: {
      coinSymbol: string;
      to: string;
      walletPassword: string;
      amount: string;
    },
    { user, wallet }: Context,
  ) => {
    this.maybeRequireStrongWalletPassword(args.walletPassword);
    const walletApi = wallet.coin(args.coinSymbol) as EthWallet;
    const { receiveAddress } = await walletApi.getWalletInfo(user);

    const { confirmed } = await walletApi.getBalance(receiveAddress);

    if (parseFloat(confirmed) < parseFloat(args.amount)) {
      throw new Error('Insufficient founds');
    }

    const validPassword = await walletApi.checkPassword(
      user,
      args.walletPassword,
    );

    if (!validPassword) {
      throw new Error('Incorrect password');
    }

    const encryptedKey = await walletApi.getEncryptedPrivKey(user.userId);

    const decryptedPrivateKey = this.decrypt(encryptedKey, args.walletPassword);
    try {
      const confirmTrade = await startSwap.confirmSwap(
        args.coinSymbol,
        args.walletPassword,
        args.amount,
      );

      return confirmTrade;
    } catch (error) {
      logger.warn(`resolvers.Swap.startSwap.catch: ${error}`);
      let message;
      switch (error.message) {
        case 'Weak Password': {
          message = 'Incorrect Password';
          break;
        }
        case 'Invalid two factor auth token': {
          message = 'Invalid one-time password';
          break;
        }
        default: {
          throw error;
        }
      }
      return {
        success: false,
        message,
      };
    }
  };

  startSwap = async (
    parent: any,
    args: {
      amount: string;
      inputToken: ISwapToken[];
      outputToken: ISwapToken[];
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);

    try {
      const Swap = await startSwap.uniswapSwap(
        args.inputToken,
        args.outputToken,
        args.amount,
      );

      return Swap;
    } catch (error) {
      logger.warn(`resolvers.Swap.startSwap.catch: ${error}`);
    }
  };
}

export const swapResolver = new SwapResolvers();

export default {
  Query: {
    swapParams: swapResolver.getSwapParams,
  },

  Tokens: {
    feeEstimate: swapResolver.estimateFee,
    balance: swapResolver.getBalance,
  },

  Mutation: {
    startSwap: swapResolver.startSwap,
    confirmSwap: swapResolver.confirmSwap,
  },
};
