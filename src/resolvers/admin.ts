import { auth, config } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';

class Resolvers extends ResolverBase {
  getImpersonationToken = async (
    parent: any,
    args: { userId: string },
    { user }: Context,
  ) => {
    this.requireAdmin(user);
    const token = await auth.signInAs(user.token, args.userId, config.hostname);

    return { token };
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    getImpersonationToken: resolvers.getImpersonationToken,
  },
};
