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
}

const resolvers = new Resolvers();

export default {
  Query: {
    ownedItems: resolvers.getOwnedItems,
    farmBotRequired: resolvers.getFarmBotRequiredParts,
  },
};
