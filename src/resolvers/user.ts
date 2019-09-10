import ResolverBase from '../common/Resolver-Base';
import { auth, config, logger } from '../common';
import { Context } from '../types/context';
import { UserApi } from '../data-sources/';
import { User } from '../models';
import autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async createUser(
    parent: any,
    args: {
      userInfo: {
        token: string;
        firstName: string;
        lastName: string;
        phone: string;
        phoneCountry: string;
        referredBy: string;
      };
    },
  ) {
    try {
      const { token, firstName, lastName, phone, referredBy } = args.userInfo;
      const firebaseUid = await auth.getFirebaseUid(token, config.hostname);
      logger.debug(`resolvers.auth.createUser.firebaseUid:${firebaseUid}`);
      const { email } = await auth.getUser(firebaseUid, config.hostname);
      const newUser = new User({
        email,
        firebaseUid,
        firstName,
        lastName,
        phone,
        referredBy,
      });
      logger.debug(`resolvers.auth.createUser.newUser.id:${newUser.id}`);
      await newUser.save();
      const customToken = await auth.signIn(token, config.hostname);
      const userApi = new UserApi(customToken);
      return {
        userApi,
        twoFaEnabled: false,
        token: customToken,
        walletExists: false,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.createUser.catch:${error}`);
      throw error;
    }
  }

  public async updateUser(
    parent: any,
    args: { email: string; firstName: string; lastName: string; phone: string },
    { user }: Context,
  ) {
    this.requireAuth(user);
    const { email, firstName, lastName, phone } = args;
    const userDoc = await user.findFromDb();
    if (email) {
      await auth.updateUserAuth(user.uid, { email }, config.hostname);
      userDoc.set('email', email);
    }
    if (firstName) {
      userDoc.set('firstName', firstName);
    }
    if (lastName) {
      userDoc.set('lastName', lastName);
    }
    if (phone) {
      userDoc.set('phone', phone);
    }
    await userDoc.save();
    return {
      success: true,
    };
  }
}

const resolvers = new Resolvers();

export default {
  Query: {},
  Mutation: {
    createUser: resolvers.createUser,
  },
};
