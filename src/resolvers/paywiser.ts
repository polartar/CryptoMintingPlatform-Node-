import ResolverBase from '../common/Resolver-Base';
import { logger } from '../common';
import {
  IPaywiserReferenceNumberResponse,
  IPaywiserCheckReferenceNumberResponse,
  IPaywiserGetPersonAddressResponse,
  Context,
} from '../types';
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

  public checkReferenceNumber = async (parent: any, args: {}, ctx: Context) => {
    //Get the user object and verify users are allowed
    const { user } = ctx;
    this.requireAuth(user);

    try {
      const result: IPaywiserCheckReferenceNumberResponse = await paywiser.checkReferenceNumber(
        user,
      );

      return result;
    } catch (err) {
      logger.error(`resolvers.checkReferenceNumber.catch: ${err}`);
    }
  };

  public getPersonAddress = async (parent: any, args: {}, ctx: Context) => {
    //Get the user object and verify users are allowed
    const { user } = ctx;
    this.requireAuth(user);

    try {
      const result: IPaywiserGetPersonAddressResponse = await paywiser.getPersonAddress(
        user,
      );

      return result;
    } catch (err) {
      logger.error(`resolvers.getPersonAddress.catch: ${err}`);
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    referenceNumber: resolvers.getReferenceNumber,
    checkReferenceNumber: resolvers.checkReferenceNumber,
    getPersonAddress: resolvers.getPersonAddress,
  },
};
