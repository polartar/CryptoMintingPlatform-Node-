import ResolverBase from '../common/Resolver-Base';
import { auth, config, logger } from '../common';
import { Context } from '../types/context';
import { UserApi } from '../data-sources/';
import { User, Template } from '../models';
import { crypto } from '../utils';
import { IOrderContext } from '../types';
import { s3Service } from '../services';
import { Types } from 'mongoose';

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
        communicationConsent: boolean;
      };
      ipAddress: string;
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
      const termsTemplateId = await this.getTemplateId('terms-of-service');
      const privacyTemplateId = await this.getTemplateId('privacy-policy');

      const email = userEmail.toLowerCase();
      const affiliateId = new Types.ObjectId().toHexString();

      const profilePhotoUrl = profilePhotoFilename
        ? s3Service.getUrlFromFilename(profilePhotoFilename)
        : '';

      const userObj: any = {
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
        communicationConsent?: boolean;
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
      communicationConsent,
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
    if (typeof communicationConsent === 'boolean') {
      userDoc.communicationConsent.push({
        consentGiven: communicationConsent,
        timestamp: new Date(),
      });
    }
    await userDoc.save();
    return {
      success: true,
    };
  };

  public getUserProfile = async (
    parent: { userApi: UserApi },
    args: {},
    { user, dataSources }: Context,
  ) => {
    logger.debug(`resolvers.auth.getUserProfile.userId:${user && user.userId}`);
    this.requireAuth(user);
    const { sendEmail } = dataSources;
    const profile: any = await user.findFromDb();
    profile.communicationConsent = sendEmail.checkUserConsent(profile);

    logger.debug(
      `resolvers.auth.getUserProfile.profile.id:${profile && profile.id}`,
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
  },
};
