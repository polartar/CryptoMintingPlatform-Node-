import { startSwap } from '../services/swap';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ISendOutput, ISwapToken } from '../types';
import { logger } from 'src/common';
import EthWallet from '../wallet-api/coin-wallets/eth-wallet';

class SwapResolvers extends ResolverBase {
  startSwap = async (
    parent: any,
    args: {
      coinSymbol: string;
      outputs: ISendOutput[];
      inputToken: ISwapToken[];
      outputToken: ISwapToken[];
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);

    const [{ to, amount }] = args.outputs;

    this.maybeRequireStrongWalletPassword(args.walletPassword);
<<<<<<< HEAD

    const walletApi = wallet.coin(args.coinSymbol) as EthWallet;
    const walletInfo = await walletApi.getWalletInfo(user);

    const walletResult = await walletApi.getBalance(walletInfo.receiveAddress);

    const confirmed = walletResult.confirmed;
=======
    const walletApi = wallet.coin(args.coinSymbol) as EthWallet;

    const { confirmed } = await walletApi.getBalance(user.userId);
>>>>>>> 34298a14cc430ee26f26ae8dd1ec30944a458a8a

    if (parseFloat(confirmed) < parseFloat(amount)) {
      throw new Error('Insufficient founds');
    } else {
      const validPassword = await walletApi.checkPassword(
        user,
        args.walletPassword,
      );

      if (!validPassword) {
        throw new Error('Incorrect password');
      }

      const encryptedKey = await walletApi.getEncryptedPrivKey(user.userId);

      const decryptedPrivateKey = this.decrypt(
        encryptedKey,
        args.walletPassword,
      );

      try {
        const Swap = await startSwap.uniswapSwap(
          args.inputToken,
          args.outputToken,
          amount,
          to,
          decryptedPrivateKey,
        );

        return Swap;
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
    }
  };
}

export const swapResolver = new SwapResolvers();

export default {
  Mutation: {
    startSwap: swapResolver.startSwap,
  },
};
