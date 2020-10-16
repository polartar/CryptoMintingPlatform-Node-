import ResolverBase from '../common/Resolver-Base';
import { auth, config, logger } from '../common';
import { Context } from '../types/context';
import { UserApi } from '../data-sources/';
import { User, Template } from '../models';
import { IOrderContext } from '../types';
import { s3Service } from '../services';
import { Types } from 'mongoose';
import License from '../models/licenses';
import { WalletApi } from '../wallet-api';

class Resolvers extends ResolverBase {
  private doesUserAlreadyExist = async (email: string) => {
    const user = await User.findOne({ email });

    return !!user;
  };

  private async verifyWalletsExist(user: UserApi, wallet: WalletApi) {
    logger.debug(`resolvers.auth.verifyWalletsExist.userId:${user.userId}`);

    try {
      const walletsExist = await Promise.all(
        wallet.parentInterfaces.map(parentCoin =>
          parentCoin.checkIfWalletExists(user),
        ),
      );
      logger.debug(
        `resolvers.auth.verifyWalletsExist.walletsExist:${walletsExist}`,
      );
      const bothWalletsExist = walletsExist.every(walletExists => walletExists);
      logger.debug(
        `resolvers.auth.verifyWalletsExist.bothWalletsExist:${bothWalletsExist}`,
      );
      return bothWalletsExist;
    } catch (error) {
      logger.warn(`resolvers.auth.verifyWalletsExist.catch:${error}`);
      return false;
    }
  }

  private async findOrCreateFirebaseUser(email: string, password: string) {
    try {
      const user = await auth.createFirebaseUser(
        { email, password },
        config.hostname,
      );

      return user;
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        const user = await auth.getUserByEmail(email, config.hostname);
        const updatedUser = await auth.updateUserAuth(
          user.uid,
          { password },
          config.hostname,
        );

        return updatedUser;
      }

      throw error;
    }
  }

  public createUser = async (
    parent: any,
    args: {
      userInfo: {
        email?: string;
        password?: string;
        token?: string;
        firstName: string;
        lastName: string;
        displayName: string;
        profilePhotoFilename: string;
        phone: string;
        phoneCountry: string;
        language: string;
        referralContext: IOrderContext;
        communicationConsent: boolean;
      };
      ipAddress: string;
    },
    context: Context,
  ) => {
    const {
      dataSources: { linkShortener, bitly, sendEmail, galaEmailer },
    } = context;

    const {
      email,
      password,
      token,
      firstName,
      lastName,
      displayName,
      profilePhotoFilename,
      phone = null,
      language,
      referralContext = {},
      communicationConsent,
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

    if (email) {
      const userExists = await this.doesUserAlreadyExist(email);

      if (userExists) {
        throw new Error('Email already exists.');
      }
    }

    try {
      const displayNameValid = await this.checkUniqueDisplayName(displayName);
      if (!displayNameValid) {
        throw new Error('Display name is taken or invalid');
      }

      let firebaseUser;

      if (token) {
        const firebaseUid = await auth.getFirebaseUid(token, config.hostname);
        logger.debug(`resolvers.auth.createUser.firebaseUid:${firebaseUid}`);

        firebaseUser = await auth.getUser(firebaseUid, config.hostname);
      } else {
        firebaseUser = await this.findOrCreateFirebaseUser(email, password);
      }

      const termsTemplateId = await this.getTemplateId('terms-of-service');
      const privacyTemplateId = await this.getTemplateId('privacy-policy');

      const affiliateId = new Types.ObjectId().toHexString();

      const profilePhotoUrl = profilePhotoFilename
        ? s3Service.getUrlFromFilename(profilePhotoFilename)
        : '';

      const userObj: any = {
        email: firebaseUser.email.toLowerCase(),
        firebaseUid: firebaseUser.uid,
        firstName,
        lastName,
        displayName,
        profilePhotoUrl,
        phone,
        affiliateId,
        language,
        referredBy: referredBy || config.defaultReferredBy,
        lastLogin: new Date(),
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
        termsAndConditionsAgreement: [
          {
            timestamp: new Date(),
            templateId: termsTemplateId,
            ipAddress: args.ipAddress || '',
          },
        ],
        privacyPolicyAgreement: [
          {
            timestamp: new Date(),
            templateId: privacyTemplateId,
            ipAddress: args.ipAddress || '',
          },
        ],
      };

      if (typeof communicationConsent === 'boolean') {
        userObj.communicationConsent = [
          {
            consentGiven: communicationConsent,
            timestamp: new Date(),
          },
        ];
      }

      const newUser = new User(userObj);

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

      const customToken = token
        ? await auth.signIn(token, config.hostname)
        : await auth.signInAfterRegister(firebaseUser.uid, config.hostname);
      context.user = UserApi.fromCustomToken(customToken);

      const response: {
        twoFaEnabled: boolean;
        token: string;
        walletExists: boolean;
        verificationEmailSent?: boolean;
      } = {
        twoFaEnabled: false,
        token: customToken,
        walletExists: false,
      };

      if (config.brand === 'gala') {
        await galaEmailer.sendNewUserEmailConfirmation(
          email,
          firstName,
          customToken,
        );
        response.verificationEmailSent = true;
      }

      return response;
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
        communicationConsent?: boolean;
      };
    },
    context: Context,
  ) => {
    const { user } = context;
    this.requireAuth(user);
    const {
      email,
      firstName,
      lastName,
      displayName,
      profilePhotoFilename,
      phone,
      password,
      communicationConsent,
    } = args.userInfo;

    const userDoc = await user.findFromDb();
    const emailPass: { email?: string; password?: string } = {};

    if (email) {
      emailPass.email = email;
      userDoc.set('email', email);
      userDoc.set('emailVerified', undefined, { strict: false });
      await auth.updateUserAuth(
        user.uid,
        { emailVerified: false },
        config.hostname,
      );
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
    if (typeof communicationConsent === 'boolean') {
      userDoc.communicationConsent.push({
        consentGiven: communicationConsent,
        timestamp: new Date(),
      });
    }
    await userDoc.save();
    if (email && config.brand.toLowerCase() === 'gala') {
      await this.sendVerifyEmail('_', { newAccount: false }, context);
    }
    return {
      success: true,
    };
  };

  public getUserProfile = async (
    parent: { userApi: UserApi },
    args: {},
    { user, dataSources, wallet }: Context,
  ) => {
    logger.debug(`resolvers.auth.getUserProfile.userId:${user && user.userId}`);
    this.requireAuth(user);
    const { sendEmail } = dataSources;
    const profile: any = await user.findFromDb();
    profile.communicationConsent = sendEmail.checkUserConsent(profile);

    logger.debug(
      `resolvers.auth.getUserProfile.profile.id:${profile && profile.id}`,
    );

    const walletExists = await this.verifyWalletsExist(user, wallet);

    const result = {
      ...profile.toJSON(),
      twoFaEnabled: !!profile.twoFaSecret,
      walletExists,
      twoFaAuthenticated: false,
      twoFaSecret: '',
      twoFaQrCode: '',
    };

    return result;
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

  private getTemplateId = async (templateName: string) => {
    const { id } = await Template.findOne(
      { name: templateName },
      { id: '$id' },
      { sort: { created: -1 } },
    );
    return id;
  };

  public acceptAgreements = async (
    parent: any,
    {
      agreementInfo,
    }: {
      agreementInfo: {
        privacyPolicy: boolean;
        termsAndConditions: boolean;
        ipAddress: string;
      };
    },
    { user }: Context,
  ) => {
    const { privacyPolicy, termsAndConditions, ipAddress } = agreementInfo;
    const userDoc = await user.findFromDb();

    if (termsAndConditions) {
      const termsTemplateId = await this.getTemplateId('terms-of-service');
      userDoc.termsAndConditionsAgreement.push({
        templateId: termsTemplateId,
        timestamp: new Date(),
        ipAddress,
      });
    }
    if (privacyPolicy) {
      const privacyPolicyTemplateId = await this.getTemplateId(
        'privacy-policy',
      );
      userDoc.privacyPolicyAgreement.push({
        templateId: privacyPolicyTemplateId,
        timestamp: new Date(),
        ipAddress,
      });
    }
    await userDoc.save();
    return { success: true };
  };

  public neededAgreements = async (
    parent: any,
    args: {},
    { user }: Context,
  ) => {
    const {
      termsAndConditionsAgreement,
      privacyPolicyAgreement,
    } = await user.findFromDb();
    const termsTemplateId = await this.getTemplateId('terms-of-service');
    const privacyTemplateId = await this.getTemplateId('privacy-policy');
    const neededAgreementNames = [];
    if (
      Array.isArray(termsAndConditionsAgreement) &&
      !termsAndConditionsAgreement.some(
        agreement => agreement.templateId === termsTemplateId,
      )
    ) {
      neededAgreementNames.push('Terms and Conditions');
    }
    if (
      Array.isArray(privacyPolicyAgreement) &&
      !privacyPolicyAgreement.some(
        agreement => agreement.templateId === privacyTemplateId,
      )
    ) {
      neededAgreementNames.push('Privacy Policy');
    }
    return { agreementNames: neededAgreementNames };
  };

  public sendVerifyEmail = async (
    parent: any,
    { newAccount }: { newAccount: boolean },
    { user, dataSources, req }: Context,
  ) => {
    this.requireAuth(user);

    const userDoc = await user.findFromDb();
    const { galaEmailer } = dataSources;
    const token =
      req && req.headers && req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : '';
    if (token) {
      if (newAccount) {
        await galaEmailer.sendNewUserEmailConfirmation(
          userDoc.email,
          userDoc.firstName,
          token,
        );
      } else {
        await galaEmailer.sendExistingUserEmailConfirmation(
          userDoc.email,
          userDoc.firstName,
          token,
        );
      }
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        message: 'missing authorization token',
      };
    }
  };

  public verifyEmailAddress = async (
    parent: any,
    { token }: { token: string },
    { dataSources }: Context,
  ) => {
    const validToken = await auth.verifyAndDecodeToken(token, config.hostname, {
      ignoreExpiration: true,
    });
    if (!validToken) {
      return {
        success: false,
        message: 'invalid token',
      };
    }
    const { claims, uid } = validToken;
    const userDoc = await User.findById(claims.userId).exec();

    if (!userDoc.emailVerified) {
      userDoc.set('emailVerified', new Date());
      userDoc.save();

      auth.updateUserAuth(uid, { emailVerified: true }, config.hostname);
    }
    const hasLicense = !!(await License.findOne({ userId: userDoc.id }));

    const lists = [config.emailLists.general];

    if (userDoc?.wallet?.activations?.gala?.activated) {
      lists.push(config.emailLists.upgrade);
    }
    if (hasLicense) {
      lists.push(config.emailLists.nodeOwner);
    }

    try {
      await dataSources.galaEmailer.addContact(
        userDoc.firstName,
        userDoc.lastName,
        userDoc.email,
        !!userDoc.emailVerified,
        lists,
      );
    } catch (error) {
      logger.warn(
        `resolvers.user.verifyEmailAddress.addContact.catch: ${error.stack}`,
      );
    }

    return {
      success: true,
    };
  };
}

export const userResolver = new Resolvers();

export default {
  Query: {
    profile: userResolver.getUserProfile,
    displayNameUnique: userResolver.displayNameUnique,
    neededAgreements: userResolver.neededAgreements,
  },
  Mutation: {
    createUser: userResolver.createUser,
    updateUser: userResolver.updateUser,
    unsubscribe: userResolver.unsubscribe,
    acceptAgreements: userResolver.acceptAgreements,
    sendVerifyEmail: userResolver.sendVerifyEmail,
    verifyEmailAddress: userResolver.verifyEmailAddress,
  },
};
