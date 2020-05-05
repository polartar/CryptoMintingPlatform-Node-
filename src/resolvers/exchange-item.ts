import { logger } from '../common';
import { exchangeService } from '../services';
import ResolverBase from '../common/Resolver-Base';
import { Context } from '../types/context';
import { IErc1155TokenDocument, Erc1155TokenModel, IUser } from '../models';
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
  HighOrLow,
  SortDirection,
  RarityLabel,
} from '../types';
import { UserApi } from '../data-sources';
const galaCName = 'GALA-C';
const galaIName = 'GALA-I';

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
    { user }: Context,
  ) => {
    const orderbook = await exchangeService.getItems(itemQueryInput);
    if (!orderbook?.asks?.length) {
      return [];
    }
    const itemsByNftId: {
      [index: string]: {
        uniqueItems: IUniqueItem[];
        quantity: number;
        pricesSummed: number;
      };
    } = this.categorizeItems(orderbook.asks, orderbook.timestamp);

    const allItems = await Promise.all(
      Object.keys(itemsByNftId).map(nftId =>
        this.combineExchangeItemsWithMetaInfo(
          itemsByNftId,
          orderbook.rel,
          itemQueryInput,
          nftId,
          user,
        ),
      ),
    );
    return allItems
      .map(item => {
        return { ...item, avgPrice: item.pricesSummed / item.quantity };
      })
      .sort((itemA, itemB) => {
        return this.sortProducts(
          itemA,
          itemB,
          itemQueryInput.direction,
          itemQueryInput.sortBy,
        );
      })
      .slice(0, 20);
  };
  buy = async (
    parent: any,
    {
      buyItemInput,
      walletPassword,
    }: { buyItemInput: IBuySellCoin; walletPassword: string },
    { user }: Context,
  ): Promise<IOrderStatus> => {
    try {
      const { uuid, baseAmount, relAmount } = await exchangeService.buy({
        userId: user.userId,
        walletPassword,
        base: buyItemInput.buyingCoin,
        rel: buyItemInput.sellingCoin,
        quantityBase: buyItemInput.quantity,
        tokenId: buyItemInput.tokenId,
        price: buyItemInput.price,
      });
      return {
        orderId: uuid,
        status: OrderStatus.converting,
        bought: baseAmount,
        sold: relAmount,
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
      sellItemInput,
      walletPassword,
    }: { sellItemInput: IBuySellCoin; walletPassword: string },
    { user }: Context,
  ): Promise<IOrderStatus> => {
    try {
      const { uuid, base_amount, rel_amount } = await exchangeService.sell({
        userId: user.userId,
        walletPassword,
        base: sellItemInput.buyingCoin,
        rel: sellItemInput.sellingCoin,
        quantityBase: sellItemInput.quantity,
        tokenId: sellItemInput.tokenId,
        price: sellItemInput.price,
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
      sellManyItemInput,
      walletPassword,
    }: { sellManyItemInput: IBuySellCoin[]; walletPassword: string },
    context: Context,
  ) => {
    try {
      return Promise.all(
        sellManyItemInput.map(sellItemInput => {
          return this.sell(parent, { sellItemInput, walletPassword }, context);
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
  getCompletedSwaps = async (
    parent: any,
    { base, rel, tokenId }: { base: string; rel: string; tokenId?: string },
    { user }: Context,
  ) => {
    try {
      const closedOrders = await exchangeService.getClosedOrders({
        userId: user.userId,
        base,
        rel,
        tokenId,
      });
      if (!closedOrders?.swaps?.length) {
        return { count: 0, items: [] };
      }
      const metaInfoByNftBaseId: {
        [index: string]: IErc1155TokenDocument;
      } = {};
      const itemsPromises = closedOrders.swaps.map(async order => {
        if (!metaInfoByNftBaseId[order.nftBaseId]) {
          const metaInfo = await this.getItemByNftId(order.nftBaseId + '');
          metaInfoByNftBaseId[order.nftBaseId] = metaInfo;
        }
        return {
          ...metaInfoByNftBaseId[order.nftBaseId],
          coin: order.otherCoin,
          salePrice: order.otherAmount,
          dateSold: new Date(order.startedAt),
        };
      });
      const items = await Promise.all(itemsPromises);
      return {
        count: items.length,
        items,
      };
    } catch (err) {
      logger.debug(`resolvers.exchange.item.getSoldItems.catch ${err}`);
      throw err;
    }
  };
  getSoldItems = (
    parent: any,
    {
      base = galaIName,
      rel = galaCName,
      tokenId,
    }: { base: string; rel: string; tokenId?: string },
    ctx: Context,
  ) => {
    try {
      return this.getCompletedSwaps(parent, { base, rel, tokenId }, ctx);
    } catch (err) {
      logger.debug(`resolvers.exchange.item.getSoldItems.catch ${err}`);
      throw err;
    }
  };
  getPurchasedItems = async (
    parent: any,
    {
      base = galaCName,
      rel = galaIName,
      tokenId,
    }: { base: string; rel: string; tokenId?: string },
    ctx: Context,
  ) => {
    try {
      return this.getCompletedSwaps(parent, { base, rel, tokenId }, ctx);
    } catch (err) {
      logger.debug(`resolvers.exchange.item.getPurchasedItems.catch ${err}`);
      throw err;
    }
  };
  marketHighLow = async (
    parent: any,
    {
      marketHighLowInput,
    }: {
      marketHighLowInput: {
        nftBaseId: string;
        base?: string;
        rel?: string;
        since?: Date;
      };
    },
    ctx: Context,
  ) => {
    try {
      const {
        nftBaseId,
        base = galaIName,
        rel = galaCName,
        since,
      } = marketHighLowInput;
      const marketHighLow = await exchangeService.getHistorySummary({
        nftBaseId,
        base,
        rel,
        since,
      });
      console.log({ marketHighLow });
      return {
        high: marketHighLow.currHighOnBook,
        low: marketHighLow.currLowOnBook,
        coin: marketHighLow.rel,
      };
    } catch (err) {
      logger.debug(`resolvers.exchange.item.marketHighLow.catch ${err}`);
      throw err;
    }
  };
  getItemByNftId = (nftBaseId: string) => {
    return Erc1155TokenModel.findOne({
      baseId: nftBaseId,
    })
      .lean()
      .exec() as Promise<IErc1155TokenDocument>;
  };
  getUser = (userId: string, userApi: UserApi) => {
    return userApi.Model.findOne({ id: userId })
      .lean()
      .exec() as Promise<IUser>;
  };
  combineExchangeItemsWithMetaInfo = async (
    itemsByNftId: {
      [index: string]: {
        uniqueItems: IUniqueItem[];
        quantity: number;
        pricesSummed: number;
      };
    },
    coin: string,
    { sortBy, highOrLow }: { sortBy?: SortBy; highOrLow?: HighOrLow },
    nftId: string,
    userApi: UserApi,
  ) => {
    const productInfo = await this.getItemByNftId(nftId);
    const items = await this.combineSellersWithUniqueItems(
      itemsByNftId[nftId].uniqueItems,
      userApi,
    );

    return {
      ...productInfo,
      items: items.sort((itemA, itemB) => {
        return this.sortUniqueItems(itemA, itemB, highOrLow, sortBy);
      }),
      nftBaseId: productInfo.baseId,
      coin,
      quantity: itemsByNftId[nftId].quantity,
      pricesSummed: itemsByNftId[nftId].pricesSummed,
      icon: productInfo.properties.rarity.icon,
      id: productInfo._id,
      game: productInfo.properties.game,
    };
  };
  sortUniqueItems = (
    itemA: IUniqueItem,
    itemB: IUniqueItem,
    highOrLow: HighOrLow = 1,
    sortBy?: SortBy,
  ) => {
    const multiplier = highOrLow;
    switch (sortBy) {
      case SortBy.date:
        return (
          itemA.dateListed.getTime() - multiplier * itemB.dateListed.getTime()
        );
      case SortBy.price:
        return itemA.listPrice - multiplier * itemB.listPrice;
      default:
        return (
          itemA.dateListed.getTime() - multiplier * itemB.dateListed.getTime()
        );
    }
  };
  combineSellersWithUniqueItems = async (
    items: IUniqueItem[],
    userApi: UserApi,
  ) => {
    const sellers: { [index: string]: string } = {};
    return Promise.all(
      items.map(async item => {
        if (!sellers[item.seller]) {
          const user = await this.getUser(item.seller, userApi);
          sellers[item.seller] = user.displayName;
        }
        return { ...item, seller: sellers[item.seller] };
      }),
    );
  };
  sortProducts = (
    itemA: IExchangeItem,
    itemB: IExchangeItem,
    sortDirection: SortDirection = SortDirection.ascending,
    sortBy?: SortBy,
  ) => {
    const multiplier = sortDirection === SortDirection.ascending ? 1 : -1;
    switch (sortBy) {
      case SortBy.nftBaseId:
        if (itemA.nftBaseId < itemB.nftBaseId) {
          return -1;
        }
        if (itemA.nftBaseId > itemB.nftBaseId) {
          return 1;
        }
        return 0;

      case SortBy.price:
        return itemA.avgPrice - multiplier * itemB.avgPrice;
      case SortBy.quantity:
        return itemA.quantity - multiplier * itemB.quantity;
      case SortBy.rarity:
        return (
          RarityLabel[itemA.rarity.label] -
          multiplier * RarityLabel[itemB.rarity.label]
        );
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
        orderId: item.uuid,
      };
      accum[item.nftBaseId].uniqueItems.push(uniqueItem);
      accum[item.nftBaseId].quantity += item.maxvolume;
      accum[item.nftBaseId].pricesSummed += item.price;

      return accum;
    }, {} as { [index: string]: { uniqueItems: IUniqueItem[]; quantity: number; pricesSummed: number } });
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    items: resolvers.items,
    buyStatus: resolvers.buyStatus,
    sellStatus: resolvers.sellStatus,
    listedGameItems: resolvers.listedGameItems,
    userItemsSold: resolvers.getSoldItems,
    userItemsPurchased: resolvers.getPurchasedItems,
    marketHighLow: resolvers.marketHighLow,
  },
  Mutation: {
    buy: resolvers.buy,
    sell: resolvers.sell,
    cancelItem: resolvers.cancel,
    sellMany: resolvers.sellMany,
  },
};
