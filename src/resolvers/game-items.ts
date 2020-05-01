import { Context, IGameOrder, IOrderContext } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { gameItemService } from '../services/game-item';
import { exchangeService } from '../services';
import { config } from '../common';
import { GameOrder, GameProduct, IGameProductDocument } from '../models';
import { CryptoFavorites } from '../data-sources';
class Resolvers extends ResolverBase {
  private getOrderDetails = async (
    product: IGameProductDocument,
    quantity: number,
    userId: string,
    cryptoFavorites: CryptoFavorites,
    orderContext: IOrderContext,
  ): Promise<IGameOrder> => {
    const btcUsdPrice = await cryptoFavorites.getBtcUsdPrice();
    const totalBtc = (quantity * (product.priceUsd / btcUsdPrice)).toFixed(8);
    return {
      btcUsdPrice: btcUsdPrice,
      created: new Date(),
      gameProductId: product._id,
      totalBtc: +totalBtc,
      isUpgradeOrder: false,
      itemsReceived: [],
      perUnitPriceUsd: product.priceUsd,
      quantity,
      txHash: '',
      userId,
      context: orderContext,
    };
  };

  getOwnedItems = async (parent: any, args: {}, { user }: Context) => {
    this.requireAuth(user);
    try {
      const userItems = await gameItemService.getUserItems(user.userId);
      const listedItems = await exchangeService.getOpenOrders({
        userId: user.userId,
        base: 'a',
        rel: 'a',
        tokenId: 0,
      });
      return userItems.map(userItem => ({
        ...userItem,
        nftBaseId: userItem.id,
        rarity: {
          hexcode: userItem.hexcode,
          label: userItem.label,
          icon: userItem.icon,
        },
        items: userItem.items.map(item => {
          const isListed = listedItems.swaps.findIndex(swap => {
            return swap.token_id === item.id;
          });
          return {
            ...item,
            tokenId: item.id,
            isListed: isListed === -1 ? false : true,
          };
        }),
      }));
    } catch (error) {
      throw error;
    }
  };

  getFarmBotRequiredParts = async (parent: any, args: {}, ctx: Context) => {
    this.requireAuth(ctx.user);
    try {
      const items = await gameItemService.getFarmBotRequiredItems(
        ctx.user.userId,
      );
      return items;
    } catch (error) {
      throw error;
    }
  };

  verifyEnoughItemsLeft = async (
    quantityRequested: number,
    product: IGameProductDocument,
    userId: string,
  ) => {
    let supplyRemaining;
    if (product.nftBaseId) {
      supplyRemaining = await gameItemService.getRemaingSupplyForNftBaseId(
        userId,
        product.nftBaseId,
      );
    } else {
      supplyRemaining = await gameItemService.getRemainingSupplyForRandomItems(
        userId,
      );
    }
    return supplyRemaining > quantityRequested;
  };

  openLootboxes = async (
    parent: any,
    args: { lootBoxIds: string[] },
    ctx: Context,
  ) => {
    const { user } = ctx;
    const { lootBoxIds } = args;
    this.requireAuth(user);
    try {
      const result = await gameItemService.markLootBoxesOpened(
        user.userId,
        lootBoxIds,
      );

      return {
        success: !!result,
        message: result ? '' : result,
      };
    } catch (error) {
      return {
        success: false,
        message: error,
      };
    }
  };

  private getProduct = async (productId: string) => {
    const notFound = new Error('Product not found');
    try {
      const product = await GameProduct.findById(productId).exec();
      if (!product) throw notFound;
      return product;
    } catch (error) {
      throw notFound;
    }
  };

  private assignItems = async (
    userId: string,
    ethAddress: string,
    quantityRequested: number,
    nftBaseId: string,
  ) => {
    let itemsReceived: string[];
    if (nftBaseId) {
      itemsReceived = await gameItemService.assignItemToUserByTokenId(
        userId,
        ethAddress,
        nftBaseId,
        quantityRequested,
      );
    } else {
      itemsReceived = await gameItemService.assignItemsToUser(
        userId,
        ethAddress,
        quantityRequested,
      );
    }

    return itemsReceived;
  };

  buyGameProducts = async (
    parent: any,
    args: {
      numLootBoxes: number;
      walletPassword: string;
      quantity: number;
      productId: string;
      orderContext: IOrderContext;
    },
    ctx: Context,
  ) => {
    const {
      user,
      wallet,
      dataSources: { cryptoFavorites },
    } = ctx;
    this.requireAuth(user);
    const { quantity, walletPassword, productId, orderContext = {} } = args;
    const { wallet: userWallet } = await user.findFromDb();
    const product = await this.getProduct(productId);
    const isEnoughLeft = await this.verifyEnoughItemsLeft(
      quantity,
      product,
      user.userId,
    );
    if (!isEnoughLeft) {
      throw new Error('Product out of stock');
    }
    const ethAddress = userWallet?.ethAddress || '';
    const btcWallet = wallet.coin('BTC');
    const orderDetails = await this.getOrderDetails(
      product,
      quantity,
      user.userId,
      cryptoFavorites,
      orderContext,
    );
    const outputs = [
      {
        to: config.companyFeeBtcAddresses.gala,
        amount: orderDetails.totalBtc.toFixed(8),
      },
    ];
    const { success, message, transaction } = await btcWallet.send(
      user,
      outputs,
      walletPassword,
    );

    if (!success) {
      throw new Error(message || 'Transaction failed');
    }
    orderDetails.txHash = transaction.id;
    orderDetails.itemsReceived = await this.assignItems(
      user.userId,
      ethAddress,
      quantity,
      product.nftBaseId,
    );

    GameOrder.create(orderDetails);
    const items = await this.getOwnedItems(parent, args, ctx);
    return {
      items,
      transactionHash: orderDetails.txHash,
      totalBtc: orderDetails.totalBtc,
    };
  };

  getAvailableGameProducts = async (parent: any, args: {}, ctx: Context) => {
    this.requireAuth(ctx.user);
    const gameProducts = (await GameProduct.find({})
      .lean()
      .exec()) as IGameProductDocument[];
    return gameProducts.map(gameProduct => ({
      ...gameProduct,
      id: gameProduct._id,
    }));
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    ownedItems: resolvers.getOwnedItems,
    farmBotRequired: resolvers.getFarmBotRequiredParts,
    gameProducts: resolvers.getAvailableGameProducts,
  },
  Mutation: {
    openLootBoxes: resolvers.openLootboxes,
    buyGameProducts: resolvers.buyGameProducts,
  },
};
