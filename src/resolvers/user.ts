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
    args: {
      userInfo: {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        password?: string;
      };
    },
    { user }: Context,
  ) {
    this.requireAuth(user);
    const { email, firstName, lastName, phone, password } = args.userInfo;
    const userDoc = await user.findFromDb();
    const emailPass: { email?: string; password?: string } = {};
    if (email) {
      emailPass.email = email;
      userDoc.set('email', email);
    }
    if (password) {
      emailPass.password = password;
    }
    if (emailPass.email || emailPass.password) {
      await auth.updateUserAuth(user.uid, emailPass, config.hostname);
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

  public async getUserProfile(
    parent: { userApi: UserApi },
    args: {},
    { user }: Context,
  ) {
    let userApi;
    if (!user) {
      userApi = parent.userApi;
    } else if (user) {
      userApi = user;
    } else {
      throw new Error('Cannot retreive profile');
    }
    logger.debug(`resolvers.auth.getUserProfile.userId:${userApi.userId}`);
    const profile = await userApi.findFromDb();
    return profile;
  }
}

export const userResolver = new Resolvers();

export default {
  Query: {
    profile: userResolver.getUserProfile,
  },
  Mutation: {
    createUser: userResolver.createUser,
    updateUser: userResolver.updateUser,
  },
};
