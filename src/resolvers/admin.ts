import { auth, config } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';

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

  getApiKeyServiceResource = async (
    parent: any,
    args: { userId: string; coin: string; resourceKey: string },
    { user }: Context,
  ): Promise<{ resource: string | null; error?: string }> => {
    this.requireAdmin(user);
    try {
      const resource = await credentialService.get(
        args.userId,
        args.coin,
        args.resourceKey,
      );

      return { resource };
    } catch (error) {
      return { resource: null, error: error.message };
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    getImpersonationToken: resolvers.getImpersonationToken,
    getApiKeyServiceResource: resolvers.getApiKeyServiceResource,
  },
};
