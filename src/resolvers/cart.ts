import { Context, ICartWatcherData } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { cartQueue } from '../blockchain-listeners/cart-queue';
import { CartService } from '../blockchain-listeners/cart-service';
import { addHours } from 'date-fns';
import { CartStatus, ICartAddress } from '../types/ICartAddress';
//const { decycle } = require('../utils/cycle.js');

import addressRequestModel, {
  ICartAddressRequest,
} from '../models/cart-address-requests';
import CartTransaction, { ICartTransaction } from '../models/cart-transaction';
import { logger } from '../common';

class Resolvers extends ResolverBase {
  auditAddressRequest = async (
    request: ICartAddressRequest,
  ): Promise<{ success: boolean; message?: string }> => {
    const addressRequest = new addressRequestModel();
    addressRequest.userId = request.userId ?? '';
    addressRequest.coinSymbol = request.coinSymbol ?? '';
    addressRequest.amountUsd = request.amountUsd ?? '';
    addressRequest.amountCrypto = request.amountCrypto ?? '';
    addressRequest.affiliateId = request.affiliateId ?? '';
    addressRequest.affiliateSessionId = request.affiliateSessionId ?? '';
    addressRequest.utmVariables = request.utmVariables ?? '';
    addressRequest.addresses = request.addresses;
    addressRequest.orderId = request.orderId;
    addressRequest.created = new Date();

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

    const addresses: ICartAddress[] = [];
    try {
      const currTime = new Date();
      const expDate = addHours(currTime, 1);

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
        crytoAmountRemaining: +amount,
        usdAmount: 0, 
      };

      const {keyToAdd, valueToAdd} = await cartQueue.setCartWatcher(coinSymbol.toUpperCase(), orderId, data);
      addresses.push(address);

      const auditAddressResult = await this.auditAddressRequest({
        userId,
        coinSymbol,
        orderId,
        amountUsd: `${valueToAdd.usdAmount}`,
        amountCrypto: `${valueToAdd.crytoAmount}`,
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

      const transactionExpiresDate = new Date(transaction.exp);
      return {
        success: "1",
        message: 'Found Transaction',
        status: transaction.status,
        expires: `${transactionExpiresDate.getTime()}`,
        amtToPayUSD: `${transaction.usdAmount}`,
        amtToPayCrypto: `${transaction.crytoAmount}`,
        amtToPayRemaining: `${transaction.crytoAmountRemaining}`,
      };
    } catch (err) {
      logger.error(
        `getCartOrderStatus : failed resolver : ${JSON.stringify(err)}`,
      );
    }
    return {
      success: "0",
      message: 'Could not find transaction',
      status: CartStatus[CartStatus.expired],      //TODO : if someone loses internet for 5 hrs, they will come here and it will send expired even if their payment went through
      expires: `1`,
      amtToPayUSD: `0`,
      amtToPayCrypto: `0`,
      amtToPayRemaining: `0`,
    };
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

  getAllCartAddressRequests = async (
    parent: any,
    args: {},
    ctx: Context,
  ): Promise<ICartAddressRequest[]> => {
    const { user } = ctx;
    this.requireAuth(user);
    let allAddresses: ICartAddressRequest[];
    try {
      allAddresses = await addressRequestModel.find({}).exec();
    } catch (error) {
      logger.warn(`cart.getAllCartAddressRequests ${error}`);
      throw error;
    }
    return allAddresses;
  };

  getAllCartTransactions = async (
    parent: any,
    args: {},
    ctx: Context,
  ): Promise<ICartTransaction[]> => {
    const { user } = ctx;
    this.requireAuth(user);
    let allTransactions: ICartTransaction[];
    try {
      allTransactions = await CartTransaction.find({}).exec();
    } catch (error) {
      logger.warn(`cart.getAllCartTransactions ${error}`);
      throw error;
    }
    return allTransactions;
  };

}

const resolvers = new Resolvers();

export default {
  Query: {
    getCartOrderStatus: resolvers.getCartOrderStatus,
    getAllCartAddressRequests: resolvers.getAllCartAddressRequests,
    getAllCartTransactions: resolvers.getAllCartTransactions,
  },
  Mutation: {
    getCartAddress: resolvers.getCartAddress,
    sendCartTransaction: resolvers.sendCartTransaction,
  },
};
