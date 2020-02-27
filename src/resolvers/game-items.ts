import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { gameItemService } from '../services/game-item';

class Resolvers extends ResolverBase {
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
}

const resolvers = new Resolvers();

export default {
  Query: {
    ownedItems: resolvers.getOwnedItems,
    farmBotRequired: resolvers.getFarmBotRequiredParts,
  },
  Mutation: {
    openLootBoxes: resolvers.openLootboxes,
  },
};
