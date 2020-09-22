import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { GameitemProduct } from '../models';
import { availableGameItemProductsPipeline } from '../pipelines';

class Resolvers extends ResolverBase {
  getAvailableGameItemProducts = async (
    parent: any,
    args: {},
    ctx: Context,
  ) => {
    return GameitemProduct.aggregate(availableGameItemProductsPipeline);
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    gameItemProducts: resolvers.getAvailableGameItemProducts,
  },
};
