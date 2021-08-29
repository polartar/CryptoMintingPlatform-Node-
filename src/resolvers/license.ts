import { config, logger, ResolverBase } from 'src/common';
import { Context } from 'src/types/context';
import { License } from 'src/models';

class Resolvers extends ResolverBase {
  getLicenses = async (parent: any, args: { type: string }, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);

    const query = {
      userId: user.userId,
      ...(args.type && { licenseTypeId: args.type })
    };

    const licenses = await License.find(query).exec();
    return licenses;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    getLicenses: resolvers.getLicenses,
  }
};
