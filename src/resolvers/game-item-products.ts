import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { GameitemProduct } from '../models';
import { availableGameItemProductsPipeline } from '../pipelines';

class Resolvers extends ResolverBase {
  getAvailableGameItemProducts = async (
    parent: any,
    args: { game: string },
    ctx: Context,
  ) => {
    return GameitemProduct.aggregate(
      availableGameItemProductsPipeline(args.game),
    );
  };

  getNodeProduct = async (parent: any, args: {}, ctx: Context) => {
    return GameitemProduct.findOne({ baseId: 'gala-node-license' });
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    gameItemProducts: resolvers.getAvailableGameItemProducts,
    nodeProduct: resolvers.getNodeProduct,
  },
};
