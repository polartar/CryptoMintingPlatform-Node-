import { UserApi } from '../data-sources';
import { WalletApi } from '../wallet-api';
import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { IUserWalletDoc as IUserWallet } from '../models/user';
import {
  IBuySellCoin,
  //   IBuyItem,
  //   ISellItem,
  IConversion,
  IOrderStatus,
  OrderStatus,
  //   SwapEvents,
  TakerOrMaker,
  //   OrderStatusResponse,
} from '../types';

class Resolvers extends ResolverBase {
  public convert = {
    status: async (
      parent: any,
      { orderId, walletPassword }: { orderId: string; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
          userpass: walletPassword,
          uuid: orderId,
        });
        if (orderStatus.type === TakerOrMaker.taker) {
          const swap = await exchangeService.getSwapStatus({
            userpass: walletPassword,
            userId: user.userId,
            uuid: orderStatus.order.request.uuid,
          });
          return {
            status: exchangeService.extractSwapStatusFromSwapEvents(swap),
            orderId: orderStatus.order.request.uuid,
          };
        } else if (orderStatus.type === TakerOrMaker.maker) {
          const swapsPromises = Object.values(orderStatus.order.matches).map(
            async match => {
              const swap = await exchangeService.getSwapStatus({
                userpass: walletPassword,
                userId: user.userId,
                uuid: match.request.uuid,
              });
              const swapStatus = exchangeService.extractSwapStatusFromSwapEvents(
                swap,
              );
              return swapStatus;
            },
          );
          const swaps = await Promise.all(swapsPromises);
          const oneSwapIsStillConverting = swaps.find(status => {
            return status === OrderStatus.converting;
          });
          if (
            orderStatus.order.available_amount === '0' &&
            !oneSwapIsStillConverting
          ) {
            return {
              status: OrderStatus.complete,
              orderId: orderStatus.order.uuid,
            };
          } else {
            return {
              status: OrderStatus.converting,
              orderId: orderStatus.order.uuid,
            };
          }
        }
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.status.catch ${err}`);
        throw err;
      }
    },
    pricesAndFees: async (
      parent: any,
      {
        buySellCoin,
        walletPassword,
      }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ): Promise<IConversion> => {
      try {
        const expires = new Date(new Date().getTime() + 1000 * 60 * 5);
        const orders = await exchangeService.getOrderbook({
          userpass: walletPassword,
          userId: user.userId,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
        });
        const lowestPrice = orders.asks.sort(
          (orderA, orderB) => orderA.price - orderB.price,
        )[0].price;
        const fee = await exchangeService.getFee({
          userpass: walletPassword,
          userId: user.userId,
          coin: buySellCoin.sellingCoin,
        });
        return {
          price: lowestPrice,
          fees: fee.amount,
          expires: new Date(orders.expires),
          buyingCoin: buySellCoin.buyingCoin,
          sellingCoin: buySellCoin.sellingCoin,
        };
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.pricesAndFees.catch ${err}`);
        throw err;
      }
    },
    coin: async (
      parent: any,
      {
        buySellCoin,
        walletPassword,
      }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ): Promise<IOrderStatus> => {
      try {
        const { uuid, base_amount, rel_amount } = await exchangeService.buy({
          userId: user.userId,
          userpass: walletPassword,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
          volume: buySellCoin.quantity.toString(),
          price: buySellCoin.price.toString(),
        });
        return {
          orderId: uuid,
          status: OrderStatus.converting,
          bought: base_amount,
          sold: rel_amount,
        };
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.coin.catch ${err}`);
        throw err;
      }
    },
    completed: async (
      parent: any,
      {
        walletPassword,
        from_uuid,
        limit,
      }: { walletPassword: string; from_uuid?: string; limit?: number },
      { user }: Context,
    ): Promise<IOrderStatus[]> => {
      try {
        const recentSwaps = await exchangeService.getRecentSwaps({
          userpass: walletPassword,
          userId: user.userId,
          from_uuid,
          limit,
        });
        return exchangeService
          .extractOrderStatusFromSwapEvents(recentSwaps.swaps)
          .filter(({ status }) => {
            return status === OrderStatus.complete;
          });
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.completed.catch ${err}`);
        throw err;
      }
    },
    pending: async (
      parent: any,
      { walletPassword }: { walletPassword: string },
      { user }: Context,
    ): Promise<IOrderStatus[]> => {
      try {
        const myOrders = await exchangeService.getMyOrders({
          userpass: walletPassword,
          userId: user.userId,
        });
        const makerOrders = Object.values(myOrders.maker_orders).map(order => {
          return exchangeService.extractOrderInfoFromMyOrder({
            order,
            type: TakerOrMaker.maker,
          });
        });
        const takerOrders = Object.values(myOrders.taker_orders).map(order => {
          return exchangeService.extractOrderInfoFromMyOrder({
            order,
            type: TakerOrMaker.taker,
          });
        });
        return [...makerOrders, ...takerOrders];
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.pending.catch ${err}`);
        throw err;
      }
    },
    cancel: async (
      parent: any,
      { orderId, walletPassword }: { orderId: string; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const cancelStatus = await exchangeService.cancel({
          userpass: walletPassword,
          userId: user.userId,
          uuid: orderId,
        });
        return cancelStatus;
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.cancel.catch ${err}`);
        throw err;
      }
    },
  };
  public item = {
    items: async (
      parent: any,
      {
        buySellCoin,
        walletPassword,
      }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const orders = await exchangeService.getOrderbook({
          userpass: walletPassword,
          userId: user.userId,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
        });
        const lowestPrice = orders.asks.sort(
          (orderA, orderB) => orderA.price - orderB.price,
        )[0].price;
        const fee = await exchangeService.getFee({
          userpass: walletPassword,
          userId: user.userId,
          coin: buySellCoin.sellingCoin,
        });
        return {
          price: lowestPrice,
          fees: fee.amount,
          expires: new Date(),
          buyingCoin: buySellCoin.buyingCoin,
          sellingCoin: buySellCoin.sellingCoin,
        };
      } catch (err) {
        logger.debug(`resolvers.exchange.item.items.catch ${err}`);
        throw err;
      }
    },
    buy: async (
      parent: any,
      {
        buySellCoin,
        walletPassword,
      }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ): Promise<IOrderStatus> => {
      try {
        const { uuid, base_amount, rel_amount } = await exchangeService.buy({
          userId: user.userId,
          userpass: walletPassword,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
          volume: buySellCoin.quantity.toString(),
          price: buySellCoin.price.toString(),
        });
        return {
          orderId: uuid,
          status: OrderStatus.converting,
          bought: base_amount,
          sold: rel_amount,
        };
      } catch (err) {
        logger.debug(`resolvers.exchange.item.buy.catch ${err}`);
        throw err;
      }
    },
    buyStatus: async () => async (
      parent: any,
      { orderId, walletPassword }: { orderId: string; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
          userpass: walletPassword,
          uuid: orderId,
        });
        return orderStatus;
      } catch (err) {
        logger.debug(`resolvers.exchange.item.buyStatus.catch ${err}`);
        throw err;
      }
    },
    sell: async (
      parent: any,
      {
        buySellCoin,
        walletPassword,
      }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ): Promise<IOrderStatus> => {
      try {
        const { uuid, base_amount, rel_amount } = await exchangeService.sell({
          userId: user.userId,
          userpass: walletPassword,
          base: buySellCoin.sellingCoin,
          rel: buySellCoin.buyingCoin,
          volume: buySellCoin.quantity.toString(),
          price: buySellCoin.price.toString(),
        });
        return {
          orderId: uuid,
          status: OrderStatus.converting,
          bought: base_amount,
          sold: rel_amount,
        };
      } catch (err) {
        logger.debug(`resolvers.exchange.item.sell.catch ${err}`);
        throw err;
      }
    },
    sellMany: (
      parent: any,
      {
        buySellCoins,
        walletPassword,
      }: { buySellCoins: IBuySellCoin[]; walletPassword: string },
      context: Context,
    ) => {
      try {
        return Promise.all(
          buySellCoins.map(buySellCoin => {
            return this.item.sell('', { buySellCoin, walletPassword }, context);
          }),
        );
      } catch (err) {
        logger.debug(`resolvers.exchange.item.sellMany.catch ${err}`);
        throw err;
      }
    },
    sellStatus: async () => async (
      parent: any,
      { orderId, walletPassword }: { orderId: string; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
          userpass: walletPassword,
          uuid: orderId,
        });
        return orderStatus;
      } catch (err) {
        logger.debug(`resolvers.exchange.item.sellStatus.catch ${err}`);
        throw err;
      }
    },
    cancel: async (
      parent: any,
      { orderId, walletPassword }: { orderId: string; walletPassword: string },
      { user }: Context,
    ) => {
      try {
        const cancelStatus = await exchangeService.cancel({
          userpass: walletPassword,
          userId: user.userId,
          uuid: orderId,
        });
        return cancelStatus;
      } catch (err) {
        logger.debug(`resolvers.exchange.item.cancel.catch ${err}`);
        throw err;
      }
    },
  };

  //   public convert = {
  //     status: async (
  //       parent: any,
  //       { orderId }: { orderId: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const { status } = await exchangeService.convert.status(
  //           orderId,
  //           user.userId,
  //         );
  //         return status;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.status.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     pricesAndFees: async (
  //       parent: any,
  //       { buySellCoin }: { buySellCoin: IBuySellCoin },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const conversion = await exchangeService.convert.pricesAndFees(
  //           buySellCoin,
  //           user.userId,
  //         );
  //         return conversion;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.pricesAndFees.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     coin: async (
  //       parent: any,
  //       {
  //         buySellCoin,
  //         walletPassword,
  //       }: { buySellCoin: IBuySellCoin; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.convert.coin(
  //           buySellCoin,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.coin.catch ${err}`);
  //         throw err;
  //       }
  //     },

  //     completed: async (parent: any, args: any, { user }: Context) => {
  //       try {
  //         const completedOrderStatuses = await exchangeService.convert.completed(
  //           user.userId,
  //         );
  //         return completedOrderStatuses;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.completed.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     pending: async (parent: any, args: any, { user }: Context) => {
  //       try {
  //         const pendingOrderStatuses = await exchangeService.convert.pending(
  //           user.userId,
  //         );
  //         return pendingOrderStatuses;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.pending.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     cancel: async (
  //       parent: any,
  //       { orderId, walletPassword }: { orderId: string; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.convert.cancel(
  //           orderId,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.convert.cancel.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //   };
  //   public item = {
  //     items: async (parent: any, args: any, { user }: Context) => {
  //       try {
  //         const openOrderItems = await exchangeService.item.items(user.userId);
  //         return openOrderItems;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.items.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     buy: async (
  //       parent: any,
  //       {
  //         buyItem,
  //         walletPassword,
  //       }: { buyItem: IBuyItem; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.item.buy(
  //           buyItem,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.buy.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     buyStatus: async (
  //       parent: any,
  //       { orderId, walletPassword }: { orderId: string; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.item.buyStatus(
  //           orderId,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.buyStatus.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     sell: async (
  //       parent: any,
  //       {
  //         sellItem,
  //         walletPassword,
  //       }: { sellItem: ISellItem; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.item.sell(
  //           sellItem,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.sell.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     sellStatus: async (
  //       parent: any,
  //       { orderId }: { orderId: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.item.sellStatus(
  //           orderId,
  //           user.userId,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.sell.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //     cancel: async (
  //       parent: any,
  //       { orderId, walletPassword }: { orderId: string; walletPassword: string },
  //       { user }: Context,
  //     ) => {
  //       try {
  //         const orderStatus = await exchangeService.item.cancel(
  //           orderId,
  //           user.userId,
  //           walletPassword,
  //         );
  //         return orderStatus;
  //       } catch (err) {
  //         logger.debug(`resolvers.exchange.item.cancel.catch ${err}`);
  //         throw err;
  //       }
  //     },
  //   };
}

const resolvers = new Resolvers();

export default {
  Query: {
    convert: {
      status: resolvers.convert.status,
      pricesAndFess: resolvers.convert.pricesAndFees,
      completed: resolvers.convert.completed,
      pending: resolvers.convert.pending,
    },
    item: {
      items: resolvers.item.items,
      buyStatus: resolvers.item.buyStatus,
      sellStatus: resolvers.item.sellStatus,
    },
  },
  Mutation: {
    convert: {
      coin: resolvers.convert.coin,
      cancel: resolvers.convert.cancel,
    },
    item: {
      buy: resolvers.item.buy,
      sell: resolvers.item.sell,
      cancel: resolvers.item.cancel,
      sellMany: resolvers.item.sellMany,
    },
  },
};
