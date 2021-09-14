import { Context, ICartWatcherData } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { cartQueue } from '../blockchain-listeners/cart-queue';
import { CartService } from '../blockchain-listeners/cart-service';
import { addHours } from 'date-fns';
import { ICartAddress } from '../types/ICartAddress';
const { decycle } = require('../utils/cycle.js');

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

    try {
      const service: CartService = new CartService();
      const txInfo: any = await service.getOrdersFromMeprCart(request.orderId);
      addressRequest.amount = txInfo.total;
    } catch (error) {
      logger.info(
        `Couldn't find the transaction info ${request.orderId} - `,
        error,
      );
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
      coinSymbol: string;
      orderId: string;
      amount: string;
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

    logger.debug(
      JSON.stringify({ notes: { parent, args, ctx: decycle(ctx) } }, null, 2),
    );

    const addresses: ICartAddress[] = [];
    try {
      const expDate = addHours(new Date(), 1);

      const walletApi = wallet.coin(coinSymbol);
      const address = await walletApi.getCartAddress(
        coinSymbol,
        orderId,
        amount,
      );
      const data: ICartWatcherData = {
        address: address.address,
        exp: expDate,
        affiliateId,
        affiliateSessionId,
        utmVariables,
        status: 'pending',
        crytoAmount: +amount,
      };

      cartQueue.setCartWatcher(coinSymbol.toUpperCase(), orderId, data);
      addresses.push(address);

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

      //Todo: Maybe add some action besides logger.warn
      if (!auditAddressResult.success)
        logger.warn(
          `cart.auditAddressRequest, Error:${auditAddressResult.message}`,
        );

      return addresses;
    } catch (error) {
      // logger.warn(`resolvers.wallet.getTransactions.catch: ${error}`);
      throw error;
    }
  };

  getCartOrderStatus = async (
    parent: any,
    args: {
      orderId: string;
      orderType: string;
      coinSymbol: string;
    },
    ctx: Context,
  ) => {
    const { orderId, orderType, coinSymbol } = args;

    let modifiedOrderId: string = orderId; //TODO : remove this when wordpress stops adding 'mepr.38' as it's id.
    if (orderType.toUpperCase() === 'MEPR') {
      modifiedOrderId = `mepr.${orderId}`;
    }

    try {
      const transaction: ICartWatcherData = await cartQueue.getTransaction(
        coinSymbol.toUpperCase(),
        modifiedOrderId,
      );

      return {
        success: 1,
        message: 'Found Transaction',
        status: transaction.status,
        exp: transaction.exp,
      };
    } catch (err) {
      logger.error(
        `getCartOrderStatus : failed resolver : ${JSON.stringify(err)}`,
      );
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
      {
        coinSymbol,
        orderId,
        amount,
        affiliateId,
        affiliateSessionId,
        utmVariables,
      },
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
  Query: {
    getCartOrderStatus: resolvers.getCartOrderStatus,
  },
  Mutation: {
    getCartAddress: resolvers.getCartAddress,
    sendCartTransaction: resolvers.sendCartTransaction,
  },
};
