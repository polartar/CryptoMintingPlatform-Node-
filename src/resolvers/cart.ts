import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
// import config from '../common/config';
// import { User } from '../models';


class Resolvers extends ResolverBase {
  getCartAddress = async (
    parent: any,
    args: {
      coinSymbol: string;
      orderId: string;
      amount?: string;
    },
    ctx: Context,
  ) => {
    const { user, wallet } = ctx;
    this.requireAuth(user);
    const { coinSymbol, orderId, amount } = args;
    this.requireAuth(user);

    const result =  [];
    try {
      if(coinSymbol){
        const walletApi = wallet.coin(parent.symbol);
        const address = await walletApi.getCartAddress(coinSymbol, orderId, amount);
        result.push(address);
      }
      else{
        const btcWalletApi = wallet.coin('BTC');
        const btcAddress = await btcWalletApi.getCartAddress('BTC', orderId, amount);
        result.push(btcAddress);

        const ethWalletApi = wallet.coin('ETH');
        const ethAddress = await ethWalletApi.getCartAddress('ETH', orderId, amount);
        result.push(ethAddress);

        const galaWalletApi = wallet.coin('GALA');
        const galaAddress = await galaWalletApi.getCartAddress('GALA', orderId, amount);
        result.push(galaAddress);
      }
      return result;
      
    } catch (error) {
      // logger.warn(`resolvers.wallet.getTransactions.catch: ${error}`);
      throw error;
    }
  };
  sendCartTransaction = async (
    parent: any,
    args: {
      coinSymbol: string;
      orderId: string;
      amount: string;
      walletPassword: string;
    },
    ctx: Context,
  ) => {
    const { user, wallet } = ctx;
    this.requireAuth(user);
    const { coinSymbol, amount, orderId, walletPassword } = args;

    const walletApi = wallet.coin(parent.symbol);
    const addressArry = await this.getCartAddress(parent, {coinSymbol, orderId}, ctx);
    const addressToSend = addressArry[0].address;
    const result = await walletApi.send(user, [{to:addressToSend, amount}], walletPassword);

    return result;
  };

}

const resolvers = new Resolvers();

export default {
  Mutation: {
    getCartAddress: resolvers.getCartAddress,
    sendCartTransaction: resolvers.sendCartTransaction,
  },
};