import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import {
  IBuySellCoin,
  IOrderStatus,
  OrderStatus,
  TakerOrMaker,
  IGetPriceResponse,
  BuySell,
} from '../types';

class Resolvers extends ResolverBase {
  getCoins = async (parent: any, args: any, { user }: Context) => {
    const coins = await exchangeService.getEnabledCoins({
      userId: user.userId,
    });
    return coins;
  };
  status = async (
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
  };
  pricesAndFees = async (
    parent: any,
    {
      base,
      token_id,
      rel,
      quantity_base,
      buy_or_sell,
    }: {
      base: string;
      token_id?: number;
      rel: string;
      quantity_base: number;
      buy_or_sell: BuySell;
    },
    ctx: Context,
  ): Promise<IGetPriceResponse> => {
    try {
      return exchangeService.getPrice({
        base,
        token_id,
        rel,
        quantity_base,
        buy_or_sell,
      });
    } catch (err) {
      logger.debug(`resolvers.exchange.convert.pricesAndFees.catch ${err}`);
      throw err;
    }
  };
  coin = async (
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
  };
  completed = async (
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
  };
  pending = async (
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
  };
  cancel = async (
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
  };
  ticks = async (parent: any, args: any, ctx: Context) => {
    try {
      const { ticks } = await exchangeService.getTicks();
      return ticks;
    } catch (err) {
      logger.debug(`resolvers.exchange.convert.ticks.catch ${err}`);
      throw err;
    }
  };
  markets = async (parent: any, args: any, ctx: Context) => {
    try {
      const { markets } = await exchangeService.getMarkets();
      return markets.map(market => ({
        ...market,
        relationships: market.relationships.map(relationship => ({
          ...relationship,
          lastPrice: relationship.last,
        })),
      }));
    } catch (err) {
      logger.debug(`resolvers.exchange.convert.markets.catch ${err}`);
      throw err;
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    markets: resolvers.markets,
    ticks: resolvers.ticks,
    status: resolvers.status,
    pricesAndFees: resolvers.pricesAndFees,
    completed: resolvers.completed,
    pending: resolvers.pending,
    coins: resolvers.getCoins,
  },
  Mutation: {
    coin: resolvers.coin,
    cancelConvert: resolvers.cancel,
  },
};
