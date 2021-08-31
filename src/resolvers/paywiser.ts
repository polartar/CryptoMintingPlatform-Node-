import ResolverBase from '../common/Resolver-Base';
import { logger } from '../common';
import { IPaywiserReferenceNumberResponse, Context } from '../types';
import { paywiser } from '../services/paywiser';

class Resolvers extends ResolverBase {
  public getReferenceNumber = async (parent: any, args: {}, ctx: Context) => {
    //Get the user object and verify users are allowed
    const { user } = ctx;
    this.requireAuth(user);

    try {
      const result: IPaywiserReferenceNumberResponse = await paywiser.getReferenceNumber(
        user,
      );

      return result;
    } catch (err) {
      logger.error(`resolvers.getReferenceNumber.catch: ${err}`);
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    referenceNumber: resolvers.getReferenceNumber,
  },
};
