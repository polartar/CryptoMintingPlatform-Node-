import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import {
  IBuySellCoin,
  IConversion,
  IOrderStatus,
  OrderStatus,
  TakerOrMaker,
} from '../types';

class Resolvers extends ResolverBase {
  public convert = {
    getCoins: async (parent: any, args: any, { user }: Context) => {
      const coins = await exchangeService.getEnabledCoins({
        userId: user.userId,
      });
      return coins;
    },
    status: async (
      parent: any,
      { orderId }: { orderId: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
          uuid: orderId,
        });
        if (orderStatus.type === TakerOrMaker.taker) {
          const swap = await exchangeService.getSwapStatus({
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
      { buySellCoin }: { buySellCoin: IBuySellCoin; walletPassword: string },
      { user }: Context,
    ): Promise<IConversion> => {
      try {
        const expires = new Date(new Date().getTime() + 1000 * 60 * 5);
        const orders = await exchangeService.getOrderbook({
          userId: user.userId,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
        });
        const lowestPrice = orders.asks.sort(
          (orderA, orderB) => orderA.price - orderB.price,
        )[0].price;
        const fee = await exchangeService.getFee({
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
      { from_uuid, limit }: { from_uuid?: string; limit?: number },
      { user }: Context,
    ): Promise<IOrderStatus[]> => {
      try {
        const recentSwaps = await exchangeService.getRecentSwaps({
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
      args: any,
      { user }: Context,
    ): Promise<IOrderStatus[]> => {
      try {
        const myOrders = await exchangeService.getMyOrders({
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
    ticks: async (parent: any, args: any, { user }: Context) => {
      try {
        const { ticks } = await exchangeService.getTickers({
          userId: user.userId,
        });
        return ticks;
        // .map(tick => {
        //   return {
        //     buyingCoin: tick.rel,
        //     sellingCoin: tick.base,
        //     price: tick.lastPrice,
        //   };
        // });
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.ticks.catch ${err}`);
        throw err;
      }
    },
    markets: async (parent: any, args: any, { user }: Context) => {
      try {
        const { markets } = await exchangeService.getMarkets({
          userId: user.userId,
        });
        return markets;
      } catch (err) {
        logger.debug(`resolvers.exchange.convert.markets.catch ${err}`);
        throw err;
      }
    },
  };
  public item = {
    items: async (
      parent: any,
      { buySellCoin }: { buySellCoin: IBuySellCoin },
      { user }: Context,
    ) => {
      try {
        const orders = await exchangeService.getOrderbook({
          userId: user.userId,
          base: buySellCoin.buyingCoin,
          rel: buySellCoin.sellingCoin,
        });
        const lowestPrice = orders.asks.sort(
          (orderA, orderB) => orderA.price - orderB.price,
        )[0].price;
        const fee = await exchangeService.getFee({
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
      { orderId }: { orderId: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
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
      { orderId }: { orderId: string },
      { user }: Context,
    ) => {
      try {
        const orderStatus = await exchangeService.getOrderStatus({
          userId: user.userId,
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
}

const resolvers = new Resolvers();

export default {
  Query: {
    convert: {
      status: resolvers.convert.status,
      pricesAndFess: resolvers.convert.pricesAndFees,
      completed: resolvers.convert.completed,
      pending: resolvers.convert.pending,
      coins: resolvers.convert.getCoins,
      ticks: resolvers.convert.ticks,
      markets: resolvers.convert.markets,
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
