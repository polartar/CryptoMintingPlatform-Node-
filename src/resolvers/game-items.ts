import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { gameItemService } from '../services/game-item';

class Resolvers extends ResolverBase {
  getOwnedItems = async (parent: any, args: {}, ctx: Context) => {
    this.requireAuth(ctx.user);
    const items = await gameItemService.getUserItems(ctx.user.userId);
    return items.map((item: any) => ({
      name: item.name,
      description: item.description,
      nftBaseId: item.nftBaseId,
      image: item.image,
      rarity: item.properties.rarity,
      amount: parseInt(item.walletTransaction.amount, 16).toFixed(),
      status: item.walletTransaction.status,
      timestamp: new Date(item.walletTransaction.timestamp),
      tokenId: item.walletTransaction.tokenId,
    }));
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    ownedItems: resolvers.getOwnedItems,
  },
};
