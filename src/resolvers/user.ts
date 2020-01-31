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
        displayName: string;
        phone: string;
        phoneCountry: string;
        referredBy: string;
        utmInfo: string[];
      };
    },
    context: Context,
  ) {
    try {
      const {
        token,
        firstName,
        lastName,
        displayName,
        phone = null,
        referredBy = null,
        utmInfo = [],
      } = args.userInfo;
      const firebaseUid = await auth.getFirebaseUid(token, config.hostname);
      logger.debug(`resolvers.auth.createUser.firebaseUid:${firebaseUid}`);
      const { email } = await auth.getUser(firebaseUid, config.hostname);
      const newUser = new User({
        email,
        firebaseUid,
        firstName,
        lastName,
        displayName,
        phone,
        referredBy,
        utmInfo,
      });
      newUser.set('wallet.userCreatedInWallet', true);
      logger.debug(`resolvers.auth.createUser.newUser._id:${newUser._id}`);
      await newUser.save();
      const customToken = await auth.signIn(token, config.hostname);
      context.user = new UserApi(customToken);
      return {
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
        displayName?: string;
        phone?: string;
        password?: string;
      };
    },
    { user }: Context,
  ) {
    this.requireAuth(user);
    const {
      email,
      firstName,
      lastName,
      displayName,
      phone,
      password,
    } = args.userInfo;
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
    if (displayName) {
      userDoc.set('displayName', displayName);
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
    logger.debug(`resolvers.auth.getUserProfile.userId:${user && user.userId}`);
    this.requireAuth(user);
    const profile = await user.findFromDb();
    logger.debug(
      `resolvers.auth.getUserProfile.prifile.id:${profile && profile.id}`,
    );
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
