import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { cartQueue } from '../blockchain-listeners/cart-queue';
import { CartService } from '../blockchain-listeners/cart-service';
import { addHours } from 'date-fns';
import { ICartAddress } from '../types/ICartAddress';
import addressRequestModel, {
  ICartAddressRequest,
} from '../models/cart-address-requests';
import { logger } from '../common';

class Resolvers extends ResolverBase {
  auditAddressRequest = async (
    request: ICartAddressRequest,
  ): Promise<{ success: boolean; message?: string }> => {
    const addressRequest = new addressRequestModel();
    addressRequest.userId = request.userId ?? '';
    addressRequest.coinSymbol = request.coinSymbol ?? '';
    addressRequest.amount = request.amount ?? '';
    addressRequest.affiliateId = request.affiliateId;
    addressRequest.affiliateSessionId = request.affiliateSessionId;
    addressRequest.affiliateSessionId = request.utmVariables;
    addressRequest.addresses = request.addresses;
    addressRequest.orderId = request.orderId;

    try{
      const service: CartService = new CartService();
      const txInfo: any = await service.getOrdersFromMeprCart(request.orderId);
      addressRequest.amount = txInfo.total;
    } catch(error) {
      logger.info(`Couldn't find the transaction info ${request.orderId} - `, error);
    }

    try {
      const savedRequest = await addressRequest.save();
      if (!savedRequest) throw new Error('AddressRequest not saved in DB');
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: true,
    };
  };

  getCartAddress = async (
    parent: any,
    args: {
      coinSymbol?: string;
      orderId: string;
      amount?: string;
      affiliateId: string;
      affiliateSessionId: string;
      utmVariables: string;
    },
    ctx: Context,
  ) => {
    const { wallet } = ctx;
    const userId = ctx.user ? ctx.user.userId : undefined;
    const {
      coinSymbol,
      orderId,
      amount,
      affiliateId,
      affiliateSessionId,
      utmVariables,
    } = args;
    const addresses: ICartAddress[] = [];

    try {
      const expDate = addHours(new Date(), 1);

      if (coinSymbol) {
        const walletApi = wallet.coin(coinSymbol);
        const address = await walletApi.getCartAddress(
          coinSymbol,
          orderId,
          amount,
        );
        cartQueue.setCartWatcher(coinSymbol.toUpperCase(), orderId, {
          address: address.address,
          exp: expDate,
          affiliateId,
          affiliateSessionId,
          utmVariables
        });
        addresses.push(address);
      } else {
        //TODO : USE THE utmContent

        const btcWalletApi = wallet.coin('BTC');
        const btcAddress = await btcWalletApi.getCartAddress(
          'BTC',
          orderId,
          amount,
        );
        cartQueue.setCartWatcher('BTC', orderId, {
          address: btcAddress.address,
          exp: expDate,
          affiliateId,
          affiliateSessionId,
          utmVariables
        });
        addresses.push(btcAddress);

        const ethWalletApi = wallet.coin('ETH');
        const ethAddress = await ethWalletApi.getCartAddress(
          'ETH',
          orderId,
          amount,
        );
        cartQueue.setCartWatcher('ETH', orderId, {
          address: ethAddress.address,
          exp: expDate,
          affiliateId,
          affiliateSessionId,
          utmVariables
        });
        addresses.push(ethAddress);
      }
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
      const auditAddressResult = await this.auditAddressRequest({
        userId,
        coinSymbol,
        orderId,
        amount,
        affiliateId,
        affiliateSessionId,
        utmVariables,
        addresses,
        created: new Date(),
      });

      //Todo: Maybe add some action besides logger.debug
      if (!auditAddressResult.success) logger.debug(auditAddressResult.message);

      return addresses;
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
      affiliateId: string;
      affiliateSessionId: string;
      utmVariables: string;
    },
    ctx: Context,
  ) => {
    const { user, wallet } = ctx;
    this.requireAuth(user);
    const {
      coinSymbol,
      amount,
      orderId,
      walletPassword,
      affiliateSessionId,
      affiliateId,
      utmVariables,
    } = args;

    const walletApi = wallet.coin(parent.symbol);
    const addressArry = await this.getCartAddress(
      parent,
      { coinSymbol, orderId, affiliateId, affiliateSessionId, utmVariables },
      ctx,
    );
    const addressToSend = addressArry[0].address;
    const result = await walletApi.send(
      user,
      [{ to: addressToSend, amount }],
      walletPassword,
    );

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
