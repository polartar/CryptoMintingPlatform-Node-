import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { GameProduct, IGameProductDocument } from '../models';
import { getDateFromAge } from '../utils';
import {
  IBuySellCoin,
  IOrderStatus,
  OrderStatus,
  IItemQueryInput,
  SortBy,
  IOrderResponse,
  IUniqueItem,
  IExchangeItem,
} from '../types';

class Resolvers extends ResolverBase {
  items = async (
    parent: any,
    { buySellCoin }: { buySellCoin: IBuySellCoin },
    { user }: Context,
  ) => {
    try {
      const orders = await exchangeService.getOrderbook({
        base: buySellCoin.buyingCoin,
        rel: buySellCoin.sellingCoin,
      });
      const lowestPrice = orders.asks.sort(
        (orderA, orderB) => orderA.price - orderB.price,
      )[0].price;
      //   const fee = await exchangeService.getFee();
      return {
        price: lowestPrice,
        // fees: fee.amount,
        expires: new Date(),
        buyingCoin: buySellCoin.buyingCoin,
        sellingCoin: buySellCoin.sellingCoin,
      };
    } catch (err) {
      logger.debug(`resolvers.exchange.item.items.catch ${err}`);
      throw err;
    }
  };
  listedGameItems = async (
    parent: any,
    { itemQueryInput }: { itemQueryInput: IItemQueryInput },
    ctx: Context,
  ) => {
    const orderbook = await exchangeService.getItems(itemQueryInput);

    const itemsByNftId: {
      [index: string]: {
        uniqueItems: IUniqueItem[];
        quantity: number;
        pricesSummed: number;
      };
    } = this.categorizeItems(orderbook.asks, orderbook.timestamp);

    const allItems = await Promise.all(
      Object.keys(itemsByNftId).map(nftId =>
        this.getItemByNftId(itemsByNftId, orderbook.rel, itemQueryInput, nftId),
      ),
    );
    return allItems
      .map(item => {
        return { ...item, avgPrice: item.pricesSummed / item.quantity };
      })
      .sort((itemA, itemB) => {
        return this.sortProducts(itemA, itemB, itemQueryInput);
      });
  };
  getItemByNftId = async (
    itemsByNftId: {
      [index: string]: {
        uniqueItems: IUniqueItem[];
        quantity: number;
        pricesSummed: number;
      };
    },
    coin: string,
    itemQueryInput: IItemQueryInput,
    nftId: string,
  ) => {
    const productInfo = (await GameProduct.findOne({
      nftBaseId: nftId,
    })
      .lean()
      .exec()) as IGameProductDocument;

    return {
      ...productInfo,
      items: itemsByNftId[nftId].uniqueItems.sort((itemA, itemB) => {
        return this.sortUniqueItems(itemA, itemB, itemQueryInput);
      }),
      coin,
      quantity: itemsByNftId[nftId].quantity,
      pricesSummed: itemsByNftId[nftId].pricesSummed,
      icon: productInfo.rarity.icon,
      id: productInfo._id,
    };
  };
  sortUniqueItems = (
    itemA: IUniqueItem,
    itemB: IUniqueItem,
    itemQueryInput: IItemQueryInput,
  ) => {
    const multiplier = itemQueryInput.highOrLow;
    switch (itemQueryInput.sortBy) {
      case SortBy.date:
        return (
          itemA.dateListed.getTime() - multiplier * itemB.dateListed.getTime()
        );
      case SortBy.price:
        return itemA.listPrice - multiplier * itemB.listPrice;
      default:
        return itemA.listPrice - multiplier * itemB.listPrice;
    }
  };
  sortProducts = (
    itemA: IExchangeItem,
    itemB: IExchangeItem,
    itemQueryInput: IItemQueryInput,
  ) => {
    const multiplier = itemQueryInput.highOrLow;
    switch (itemQueryInput.sortBy) {
      case SortBy.nftBaseId:
        if (itemA.nftBaseId < itemB.nftBaseId) {
          return -1;
        }
        if (itemA.nftBaseId < itemB.nftBaseId) {
          return 1;
        }
        return 0;

      case SortBy.price:
        return itemA.avgPrice - multiplier * itemB.avgPrice;
      default:
        return itemA.avgPrice - multiplier * itemB.avgPrice;
    }
  };
  categorizeItems = (orders: IOrderResponse[], timestamp: number) => {
    return orders.reduce((accum, item) => {
      if (!accum[item.nftBaseId]) {
        accum[item.nftBaseId] = {
          uniqueItems: [],
          quantity: 0,
          pricesSummed: 0,
        };
      }
      const uniqueItem = {
        token_id: item.token_id,
        nftBaseId: item.nftBaseId,
        seller: item.userId,
        dateListed: getDateFromAge({
          date: new Date(timestamp),
          age: item.age,
        }),
        listPrice: item.price,
      };
      accum[item.nftBaseId].uniqueItems.push(uniqueItem);
      accum[item.nftBaseId].quantity += item.maxvolume;
      accum[item.nftBaseId].pricesSummed += item.price;

      return accum;
    }, {} as { [index: string]: { uniqueItems: IUniqueItem[]; quantity: number; pricesSummed: number } });
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
        walletPassword,
        base: buySellCoin.buyingCoin,
        rel: buySellCoin.sellingCoin,
        quantityBase: buySellCoin.quantity,
        tokenId: buySellCoin.tokenId,
        price: buySellCoin.price,
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
        walletPassword,
        base: buySellCoin.buyingCoin,
        rel: buySellCoin.sellingCoin,
        quantityBase: buySellCoin.quantity,
        tokenId: buySellCoin.tokenId,
        price: buySellCoin.price,
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
        walletPassword,
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
    listedGameItems: resolvers.listedGameItems,
    // listedGameProducts: resolvers.listedGameProducts,
  },
  Mutation: {
    buy: resolvers.buy,
    sell: resolvers.sell,
    cancelItem: resolvers.cancel,
    sellMany: resolvers.sellMany,
  },
};
