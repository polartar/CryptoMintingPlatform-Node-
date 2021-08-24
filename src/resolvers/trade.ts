import { startSwap } from './../services/swap';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ISendOutput, ITradeToken } from '../types';
import { logger } from 'src/common';

class TradeResolvers extends ResolverBase {
  startTrade = async (
    parent: any,
    args: {
      coinSymbol: string;
      outputs: ISendOutput[];
      inputToken: ITradeToken[];
      outputToken: ITradeToken[];
      // accountId: string;
      // totpToken: string;
      walletPassword: string;
    },
    { user, wallet }: Context,
  ) => {
    this.requireAuth(user);
    this.maybeRequireStrongWalletPassword(args.walletPassword);
    const walletApi = wallet.coin(args.coinSymbol);

    const [{ to, amount }] = args.outputs;

    // const walletResult = {
    // 	confirmed: "1000000000000000000"
    // }

    // const fee = await exchangeService.getFee({ coin: args.inputToken[0].symbol });
    // console.log(fee)

    const walletResult = await walletApi.getBalance(
      parent.lookupTransactionsBy,
    );

    if (parseFloat(walletResult.confirmed) < parseFloat(amount)) {
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

      try {
        const trade = await startSwap.uniswapSwap(
          args.inputToken,
          args.outputToken,
          amount,
          to,
          encryptedKey,
        );

        return trade;
      } catch (error) {
        logger.warn(`resolvers.trade.startTrade.catch: ${error}`);
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

    // try {

    // 	this.requireAuth(user);
    // 	this.maybeRequireStrongWalletPassword(args.walletPassword);
    // 	// const twoFaValid = await user.validateTwoFa(totpToken);
    // 	// this.requireTwoFa(twoFaValid);

    //const walletApi = wallet.coin(args.coinSymbol);
    // 	const result = await walletApi.send(user, args.outputs, args.walletPassword);
    // 	return result;
    // } catch (error) {
    // 	logger.warn(`resolvers.trade.startTrade.catch: ${error}`);
    // 	let message;
    // 	switch (error.message) {
    // 		case 'Weak Password': {
    // 			message = 'Incorrect Password';
    // 			break;
    // 		}
    // 		case 'Invalid two factor auth token': {
    // 			message = 'Invalid one-time password';
    // 			break;
    // 		}
    // 		default: {
    // 			throw error;
    // 		}
    // 	}
    // 	return {
    // 		success: false,
    // 		message,
    // 	};
    // }
  };
}

export const tradeResolver = new TradeResolvers();

export default {
  Mutation: {
    startTrade: tradeResolver.startTrade,
  },
};
