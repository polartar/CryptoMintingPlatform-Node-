import ResolverBase from '../common/Resolver-Base';
import { auth, config, logger } from '../common';
import { Context } from '../types/context';
import { UserApi } from '../data-sources/';
import { User } from '../models';
import { crypto } from '../utils';
import { IOrderContext } from '../types';
import { s3Service } from '../services';

class Resolvers extends ResolverBase {
  public createUser = async (
    parent: any,
    args: {
      userInfo: {
        token: string;
        firstName: string;
        lastName: string;
        displayName: string;
        profilePhotoFilename: string;
        phone: string;
        phoneCountry: string;
        language: string;
        referralContext: IOrderContext;
      };
    },
    context: Context,
  ) => {
    const {
      dataSources: { linkShortener, bitly },
    } = context;

    try {
      const {
        token,
        firstName,
        lastName,
        displayName,
        profilePhotoFilename,
        phone = null,
        language,
        referralContext = {},
      } = args.userInfo;
      const {
        offer,
        referredBy,
        utm_campaign: utmCampaign = '',
        utm_content: utmContent = '',
        utm_keyword: utmKeyword = '',
        utm_medium: utmMedium = '',
        utm_name: utmName = '',
        utm_source: utmSource = '',
        utm_term: utmTerm = '',
      } = referralContext;

      const displayNameValid = await this.checkUniqueDisplayName(displayName);
      if (!displayNameValid) {
        throw new Error('Display name is taken or invalid');
      }

      const firebaseUid = await auth.getFirebaseUid(token, config.hostname);
      logger.debug(`resolvers.auth.createUser.firebaseUid:${firebaseUid}`);

      const { email: userEmail } = await auth.getUser(
        firebaseUid,
        config.hostname,
      );

      const email = userEmail.toLowerCase();
      const affiliateId = crypto.md5UrlSafe(email);

      const profilePhotoUrl = profilePhotoFilename
        ? s3Service.getUrlFromFilename(profilePhotoFilename)
        : '';

      const newUser = new User({
        email,
        firebaseUid,
        firstName,
        lastName,
        displayName,
        profilePhotoUrl,
        phone,
        affiliateId,
        language,
        referredBy: referredBy || config.defaultReferredBy,
        utmInfo: {
          offer,
          referredBy,
          utmCampaign,
          utmMedium,
          utmSource,
          utmContent,
          utmKeyword,
          utmName,
          utmTerm,
        },
      });

      let url: string;
      try {
        url = await linkShortener.getLink(newUser);
      } catch (error) {
        logger.warn(`resolvers.auth.createUser.getLink.catch:${error}`);
        url = await bitly.getLink(newUser);
      }
      newUser.set('wallet.shareLink', url);
      newUser.set('wallet.userCreatedInWallet', true);
      logger.debug(`resolvers.auth.createUser.newUser._id:${newUser._id}`);

      await newUser.save();

      const customToken = await auth.signIn(token, config.hostname);
      context.user = UserApi.fromToken(customToken);

      return {
        twoFaEnabled: false,
        token: customToken,
        walletExists: false,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.createUser.catch:${error}`);
      throw error;
    }
  };

  public updateUser = async (
    parent: any,
    args: {
      userInfo: {
        email?: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        profilePhotoFilename?: string;
        phone?: string;
        password?: string;
      };
    },
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const {
      email,
      firstName,
      lastName,
      displayName,
      profilePhotoFilename,
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
    if (profilePhotoFilename) {
      const profilePhotoUrl = s3Service.getUrlFromFilename(
        profilePhotoFilename,
      );
      userDoc.set('profilePhotoUrl', profilePhotoUrl);
    }
    if (phone) {
      userDoc.set('phone', phone);
    }
    await userDoc.save();
    return {
      success: true,
    };
  };

  public getUserProfile = async (
    parent: { userApi: UserApi },
    args: {},
    { user }: Context,
  ) => {
    logger.debug(`resolvers.auth.getUserProfile.userId:${user && user.userId}`);
    this.requireAuth(user);
    const profile = await user.findFromDb();
    logger.debug(
      `resolvers.auth.getUserProfile.prifile.id:${profile && profile.id}`,
    );
    return profile;
  };

  private checkUniqueDisplayName = async (displayName: string) => {
    if (config.supportsDisplayNames && !displayName) {
      throw new Error('Display name not specified');
    } else if (!config.supportsDisplayNames) {
      return true;
    }
    const foundUser = await User.findOne({ displayName });

    return !foundUser;
  };

  public displayNameUnique = (parent: any, args: { displayName: string }) => {
    const { displayName } = args;
    if (!config.supportsDisplayNames) {
      throw new Error('Display names not supported');
    }
    const unique = this.checkUniqueDisplayName(displayName);

    return {
      unique,
      displayName,
    };
  };

  public unsubscribe = async (
    parent: any,
    args: { userId: string; emailList: string },
  ) => {
    const { userId, emailList } = args;

    if (!userId || !emailList) {
      throw new Error('User ID and Email List required');
    }

    await User.findByIdAndUpdate(userId, {
      $push: {
        unsubscriptions: {
          list: emailList,
          timestamp: new Date(),
        },
      },
    });

    return { success: true };
  };
}

export const userResolver = new Resolvers();

export default {
  Query: {
    profile: userResolver.getUserProfile,
    displayNameUnique: userResolver.displayNameUnique,
  },
  Mutation: {
    createUser: userResolver.createUser,
    updateUser: userResolver.updateUser,
    unsubscribe: userResolver.unsubscribe,
  },
};
