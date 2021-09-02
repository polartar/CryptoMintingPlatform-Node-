import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { auth, config, logger, ResolverBase } from 'src/common';
import { Context } from 'src/types/context';
import { UserApi } from 'src/data-sources';
import { User, Template, IUserIds } from 'src/models';
import { IOrderContext, IKyc } from 'src/types';
import { careclix, s3Service } from 'src/services';
//import { emailService } from '../data-sources/send-email';
import License from 'src/models/license';
import { WalletApi } from 'src/wallet-api';
import { getNextNumber } from 'src/models/user';

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

  private findOrCreateFirebaseUser = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    try {
      const user = await auth.createFirebaseUser(
        { email, password, displayName },
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
  };

  public userExists = async (
    parent: any,
    args: { email: string },
    context: Context,
  ) => {
    return this.doesUserAlreadyExist(args.email);
  };

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
        activationTermsAndConditions: {}[];
        gender?: string;
        dateOfBirth?: Date;
        country?: string;
        countryCode?: string;
        countryPhoneCode?: string;
        clinic?: string;
        careclixId?: string;
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        kyc?: IKyc;
      };
      ipAddress: string;
    },
    context: Context,
  ) => {
    const {
      dataSources: { linkShortener, bitly, galaEmailer },
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
      activationTermsAndConditions,
      gender,
      dateOfBirth,
      country,
      countryCode,
      countryPhoneCode,
      clinic,
      careclixId,
      street,
      city,
      state,
      zipCode,
      kyc,
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
        await auth.updateDisplayName(firebaseUid, config.hostname, displayName);

        firebaseUser = await auth.getUser(firebaseUid, config.hostname);
      } else {
        firebaseUser = await this.findOrCreateFirebaseUser(
          email,
          password,
          displayName,
        );
      }

      const termsTemplateId = await this.getTemplateId('terms-of-service');
      const privacyTemplateId = await this.getTemplateId('privacy-policy');
      const number = await getNextNumber();
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
        number,
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
        activationTermsAndConditions,
        gender,
        dateOfBirth,
        country,
        countryCode,
        countryPhoneCode,
        clinic,
        careclixId,
        street,
        city,
        state,
        zipCode,
        kyc,
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

      if (config.brand === 'blue') {
        await careclix.signUp(newUser, password);
      }

      await newUser.save();

      //await emailService.sendWelcomeEmail({ email: newUser.email });

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
        verificationEmailSent: false,
      };

      if (config.brand === 'gala') {
        const verifyEmailToken = this.signVerifyEmailToken(
          newUser.id,
          newUser.firebaseUid,
        );

        await galaEmailer.sendNewUserEmailConfirmation(
          email,
          firstName,
          verifyEmailToken,
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
        secondaryEmail?: string;
        language?: string;
        userIds?: IUserIds;
        activationTermsAndConditions?: {}[];
        gender?: string;
        dateOfBirth?: Date;
        country?: string;
        countryCode?: string;
        countryPhoneCode?: string;
        clinic?: string;
        careclixId?: string;
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        token?: string;
        updateUserNumber?: boolean;
        kyc?: IKyc;
      };
    },
    context: Context,
  ) => {
    const { user } = context;
    logger.debug(`resolvers.auth.updateUser.userId:${user && user.userId}`);
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
      secondaryEmail,
      language,
      updateUserNumber,
      userIds,
      activationTermsAndConditions,
      kyc,
    } = args.userInfo;

    try {
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
      if (secondaryEmail) {
        userDoc.set('secondaryEmail', secondaryEmail);
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
        await auth.updateDisplayName(user.uid, config.hostname, displayName);
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
      if (language) {
        userDoc.set('language', language);
      }
      if (typeof communicationConsent === 'boolean') {
        userDoc.set('communicationConsent', [
          {
            consentGiven: communicationConsent,
            timestamp: new Date(),
          },
        ]);
      }
      if (updateUserNumber && !userDoc.number) {
        const number = await getNextNumber();
        userDoc.set('number', number);
      }

      if (config.brand.toLowerCase() === 'connect' && userIds) {
        if (Object.keys(userIds).length >= 1)
          //isn't the empty object {}.
          userDoc.set('userIds', userIds);
        // Make userIds object equal to {} to unset de database sub-document.
        else userDoc.set('userIds', undefined, { strict: false });
      }

      if (activationTermsAndConditions?.length) {
        userDoc.set(
          'activationTermsAndConditions',
          activationTermsAndConditions,
        );
      }

      if (kyc) {
        userDoc.set('kyc', kyc);
      }

      const savedUser = await userDoc.save();
      if (email && config.brand.toLowerCase() === 'gala') {
        /**
         * Wheter the next sentence fails or not, it is still needed to return a value,
         * because at this point the user had been updated.
         */
        try {
          await this.sendVerifyEmail('_', { newAccount: false }, context);
        } catch (error) {
          //Todo: consider to add a sendVerifyEmailError field to the graphql type: UpdateUserResponse!,
          //and set this field here.
        }
      }
      logger.debug(
        `resolvers.auth.updateUser.updatedProfile.id:${savedUser &&
          savedUser.id}`,
      );
      return {
        success: true,
        user: savedUser,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
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

  public isDisplayNameUnique = (parent: any, args: { displayName: string }) => {
    const { displayName } = args;
    if (!config.supportsDisplayNames) {
      throw new Error('Display names not supported');
    }
    const unique = this.checkUniqueDisplayName(displayName);

    return {
      unique,
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
    { user, dataSources }: Context,
  ) => {
    this.requireAuth(user);

    const userDoc = await user.findFromDb();
    const { galaEmailer } = dataSources;

    const token = this.signVerifyEmailToken(user.userId, userDoc.firebaseUid);

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
  };

  public verifyEmailAddress = async (
    parent: any,
    { token }: { token: string },
    { dataSources }: Context,
  ) => {
    const validToken = jwt.verify(token, config.jwtPublicKey, {
      algorithms: ['RS256'],
      issuer: `urn:${config.brand}`,
      audience: `urn:${config.brand}`,
      subject: `${config.brand}:subject`,
      ignoreExpiration: true,
    }) as { userId: string; uid: string };

    if (!validToken) {
      return {
        success: false,
        message: 'invalid token',
      };
    }

    const { userId, uid } = validToken;
    const userDoc = await User.findById(userId).exec();

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

  private signVerifyEmailToken(userId: string, uid: string) {
    return jwt.sign({ userId, uid }, config.jwtPrivateKey, {
      algorithm: 'RS256',
      issuer: `urn:${config.brand}`,
      audience: `urn:${config.brand}`,
      subject: `${config.brand}:subject`,
    });
  }
}

export const userResolver = new Resolvers();

export default {
  Query: {
    userExists: userResolver.userExists,
    profile: userResolver.getUserProfile,
    isDisplayNameUnique: userResolver.isDisplayNameUnique,
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
