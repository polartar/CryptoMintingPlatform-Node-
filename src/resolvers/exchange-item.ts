import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { IBuySellCoin, IOrderStatus, OrderStatus } from '../types';

class Resolvers extends ResolverBase {
  items = async (
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
  };
  buy = async (
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
  };
  buyStatus = async () => async (
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
  };
  sell = async (
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
  };
  sellMany = (
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
          return this.sell('', { buySellCoin, walletPassword }, context);
        }),
      );
    } catch (err) {
      logger.debug(`resolvers.exchange.item.sellMany.catch ${err}`);
      throw err;
    }
  };
  sellStatus = async () => async (
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
      logger.debug(`resolvers.exchange.item.cancel.catch ${err}`);
      throw err;
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    items: resolvers.items,
    buyStatus: resolvers.buyStatus,
    sellStatus: resolvers.sellStatus,
  },
  Mutation: {
    buy: resolvers.buy,
    sell: resolvers.sell,
    cancelItem: resolvers.cancel,
    sellMany: resolvers.sellMany,
  },
};
