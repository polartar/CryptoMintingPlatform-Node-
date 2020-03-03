import { Context, ILootBoxOrder, IGameToken } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { gameItemService } from '../services/game-item';
import { config } from '../common';
import { LootBoxOrder } from '../models';
import { CryptoFavorites } from '../data-sources';

class Resolvers extends ResolverBase {
  private getLootBoxTotalCost = async (
    quantity: number,
    cryptoFavorites: CryptoFavorites,
  ) => {
    const price = await cryptoFavorites.getBtcUsdPrice();
    return (quantity * (config.costPerLootBox / price)).toFixed(8);
  };

  getOwnedItems = async (parent: any, args: {}, ctx: Context) => {
    this.requireAuth(ctx.user);
    try {
      const items = await gameItemService.getUserItems(ctx.user.userId);
      return items;
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

  getLootBoxPrice = (parent: any, args: {}, ctx: Context) => {
    this.requireAuth(ctx.user);
    return config.costPerLootBox;
  };

  buyLootBoxes = async (
    parent: any,
    args: { numLootBoxes: number; walletPassword: string },
    ctx: Context,
  ) => {
    const {
      user,
      wallet,
      dataSources: { cryptoFavorites },
    } = ctx;
    const { numLootBoxes, walletPassword } = args;
    this.requireAuth(user);
    const { wallet: userWallet } = await user.findFromDb();
    const ethAddress = userWallet?.ethAddress || '';
    const btcWallet = wallet.coin('BTC');
    const amount = await this.getLootBoxTotalCost(
      numLootBoxes,
      cryptoFavorites,
    );
    const outputs = [{ to: config.companyFeeBtcAddresses.arcade, amount }];
    const { success, message, transaction } = await btcWallet.send(
      user,
      outputs,
      walletPassword,
    );
    if (!success) {
      throw new Error(message || 'Transaction failed');
    }
    const itemsReceived = await gameItemService.assignItemsToUser(
      user.userId,
      ethAddress,
      numLootBoxes,
    );
    const newLootBoxOrder: ILootBoxOrder = {
      isUpgradeOrder: false,
      quantity: numLootBoxes,
      totalBtc: +amount,
      txHash: transaction.id,
      userId: user.userId,
      itemsReceived,
    };
    LootBoxOrder.create(newLootBoxOrder);
    const items = await this.getOwnedItems(parent, args, ctx);
    return items;
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    ownedItems: resolvers.getOwnedItems,
    farmBotRequired: resolvers.getFarmBotRequiredParts,
    lootBoxPrice: resolvers.getLootBoxPrice,
  },
  Mutation: {
    openLootBoxes: resolvers.openLootboxes,
    buyLootBoxes: resolvers.buyLootBoxes,
  },
};
