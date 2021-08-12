import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import {cartQueue} from '../blockchain-listeners/cart-queue';
import config from '../common/config';
// import { User } from '../models';
import { addHours } from 'date-fns';

class Resolvers extends ResolverBase {
  getCartAddress = async (
    parent: any,
    args: {
      coinSymbol?: string;
      orderId: string;
      amount?: string;
    },
    ctx: Context,
  ) => {
    const { wallet } = ctx;
    const { coinSymbol, orderId, amount } = args;
    const result =  [];

    try {
      const expDate = addHours(new Date(), 1);

      if(coinSymbol){
        const walletApi = wallet.coin(coinSymbol);
        const address = await walletApi.getCartAddress(coinSymbol, orderId, amount);
        cartQueue.setCartWatcher(config.brand, coinSymbol.toUpperCase(), orderId, {address: address.address, exp: expDate});
        result.push(address);
      }
      else{
        const btcWalletApi = wallet.coin('BTC');
        const btcAddress = await btcWalletApi.getCartAddress('BTC', orderId, amount);
        cartQueue.setCartWatcher(config.brand, 'BTC', orderId, {address: btcAddress.address, exp: expDate});
        result.push(btcAddress);

        const ethWalletApi = wallet.coin('ETH');
        const ethAddress = await ethWalletApi.getCartAddress('ETH', orderId, amount);
        cartQueue.setCartWatcher(config.brand, 'ETH', orderId, {address: ethAddress.address, exp: expDate});
        result.push(ethAddress);

        // const galaWalletApi = wallet.coin('GALA');
        // const galaAddress = await galaWalletApi.getCartAddress('GALA', orderId, amount);
        // cartQueue.setCartWatcher(config.brand, 'GALA', orderId, {address: galaAddress.address, exp: expDate});
        // result.push(galaAddress);

        // const greenWalletApi = wallet.coin('GREEN');
        // const greenAddress = await greenWalletApi.getCartAddress('GREEN', orderId, amount);
        // cartQueue.setCartWatcher(config.brand, 'GREEN', orderId, {address: greenAddress.address, exp: expDate});
        // result.push(greenAddress);

        // const batWalletApi = wallet.coin('BAT');
        // const batAddress = await batWalletApi.getCartAddress('BAT', orderId, amount);
        // result.push(batAddress);
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
