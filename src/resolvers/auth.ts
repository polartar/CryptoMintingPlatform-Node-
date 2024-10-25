import { auth, config, logger } from '../common';
import { Context, IUserClaims } from '../types/context';
import { WalletApi } from '../wallet-api';
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
import { UserApi } from '../data-sources/';
const autoBind = require('auto-bind');
import { userResolver } from './user';
import galaGamingApiService from '../services/gala-gaming-api';
import { paywiser } from '../services/paywiser';
import { IPaywiserCheckReferenceNumberResponse } from '../types/IPaywiser';

interface ITwoFaSetup {
  twoFaSecret: string | null;
  twoFaQrCode: string | null;
}
class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

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

  private async checkKycVerificationStatus(user: UserApi) {
    const userDbObject = await user.findFromDb();

    if (!userDbObject.kyc?.ReferenceID) {
      return;
    }

    const verificationStatuses = {
      SUCCESSFUL: 'Successful',
      PENDING: 'Pending',
      FAILED: 'Failed',
      NOTSTARTED: 'NotStarted',
    };

    const verificationStatus =
      userDbObject.kyc.VerificationStatus || verificationStatuses.NOTSTARTED;

    switch (verificationStatus) {
      case verificationStatuses.SUCCESSFUL:
        // return
        break;
      case verificationStatuses.FAILED:
        // return or something
        break;
      case verificationStatuses.PENDING:
      case verificationStatuses.NOTSTARTED:
      default:
        //Pending or doesn't exist
        const result: IPaywiserCheckReferenceNumberResponse = await paywiser.checkReferenceNumber(
          user,
        );

        return result.VerificationStatus;
    }
  }

  private async setupTwoFa(
    claims: IUserClaims,
    userApi: UserApi,
  ): Promise<ITwoFaSetup> {
    try {
      let secret: string | null = null;
      let qrCode: string | null;
      logger.debug(
        `resolvers.auth.setupTwoFa.claims.twoFaEnabled:${claims.twoFaEnabled}`,
      );
      if (!claims.twoFaEnabled) {
        const {
          qrCode: userQrCode,
          secret: userSecret,
        } = await userApi.setTempTwoFaSecret();
        secret = userSecret;
        qrCode = userQrCode;
        logger.debug(`resolvers.auth.setupTwoFa.claims.!!secret:${!!secret}`);
        logger.debug(
          `resolvers.auth.setupTwoFa.claims.!!secret:${!!userQrCode}`,
        );
      }
      return {
        twoFaSecret: secret,
        twoFaQrCode: qrCode,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.setupTwoFa.catch:${error}`);
      throw error;
    }
  }

  public async login(parent: any, args: { token: string }, context: Context) {
    try {
      logger.debug(`resolvers.auth.login.!!args.token:${!!args.token}`);
      const token = await auth.signIn(args.token, config.hostname);
      logger.debug(`resolvers.auth.login.!!token:${!!token}`);
      const tempUserApi = UserApi.fromCustomToken(token);
      tempUserApi.update({ $set: { lastLogin: new Date() } });
      const walletExists = await this.verifyWalletsExist(
        tempUserApi,
        context.wallet,
      );
      logger.debug(`resolvers.auth.login.walletExists:${walletExists}`);

      await this.checkKycVerificationStatus(tempUserApi);

      context.user = tempUserApi;
      return {
        twoFaEnabled: tempUserApi.claims.twoFaEnabled,
        token,
        walletExists,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.login.catch:${error}`);
      throw error;
    }
  }

  public async validateExistingToken(
    parent: any,
    args: {},
    { user, wallet }: Context,
  ) {
    try {
      logger.debug(
        `resolvers.auth.validateExistingToken.userId:${user && user.userId}`,
      );
      this.requireAuth(user);
      logger.debug(`resolvers.auth.validateExistingToken.requireAuth:ok`);
      const newToken = await auth.signInWithDifferentCustomToken(
        user.token,
        config.hostname,
      );
      if (!newToken) throw new Error('Unauthorized');
      const tempUser = UserApi.fromCustomToken(newToken);
      const walletExists = await this.verifyWalletsExist(tempUser, wallet);
      logger.debug(
        `resolvers.auth.validateExistingToken.walletExists:${walletExists}`,
      );
      const twoFaSetup = await this.setupTwoFa(user, user);
      logger.debug(
        `resolvers.auth.validateExistingToken.!!token:${!!user.token}`,
      );
      const twoFaAuthenticated = await auth.verifyTwoFaAuthenticated(
        user.token,
        config.hostname,
      );
      logger.debug(
        `resolvers.auth.validateExistingToken.twoFaAuthenticated:${twoFaAuthenticated}`,
      );
      return {
        userApi: user,
        twoFaEnabled: user.twoFaEnabled,
        twoFaAuthenticated,
        walletExists,
        newToken,
        ...twoFaSetup,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.validateExistingToken.catch:${error}`);
      throw error;
    }
  }

  public async twoFaRegister(parent: any, args: {}, { user }: Context) {
    try {
      logger.debug(
        `resolvers.auth.twoFaRegister.userId:${user && user.userId}`,
      );
      this.requireAuth(user);
      logger.debug(`resolvers.auth.twoFaRegister.requireAuth:ok`);
      const { twoFaSecret } = await user.findFromDb();
      logger.debug(
        `resolvers.auth.twoFaRegister.requireAuth.twoFaSecret:${twoFaSecret}`,
      );
      if (twoFaSecret) {
        throw new ApolloError('Two Factor Authentication is already set up.');
      }
      const { qrCode, secret } = await user.setTempTwoFaSecret();
      logger.debug(`resolvers.auth.twoFaRegister.!!qrCode:${!!qrCode}`);

      return { twoFaQrCode: qrCode, twoFaSecret: secret };
    } catch (error) {
      logger.warn(`resolvers.auth.twoFaRegister.catch:${error}`);
      throw error;
    }
  }

  public async twoFaValidate(
    parent: any,
    args: { totpToken: string },
    { user }: Context,
  ) {
    try {
      logger.debug(
        `resolvers.auth.twoFaValidate.userId:${user && user.userId}`,
      );
      this.requireAuth(user);
      logger.debug(`resolvers.auth.twoFaValidate.requireAuth:ok`);
      logger.debug(`resolvers.auth.twoFaValidate.!!token:${!!user.token}`);
      const { authenticated, newToken } = await auth.validateTwoFa(
        config.hostname,
        user.token,
        args.totpToken,
      );
      logger.debug(
        `resolvers.auth.twoFaValidate.authenticated:${authenticated}`,
      );
      logger.debug(`resolvers.auth.twoFaValidate.!!newToken:${!!newToken}`);
      return { authenticated, newToken };
    } catch (error) {
      logger.warn(`resolvers.auth.twoFaValidate.catch:${error}`);
      throw error;
    }
  }

  public async disableTwoFa(
    parent: any,
    args: { totpToken: string },
    { user }: Context,
  ) {
    logger.debug(`resolvers.auth.disableTwoFa.!!user:${!!user}`);
    this.requireAuth(user);
    try {
      const newToken = await auth.disableTwoFa(
        config.hostname,
        user.token,
        args.totpToken,
      );
      logger.debug(`resolvers.auth.disableTwoFa.!!newToken:${!!newToken}`);
      return {
        authenticated: !!newToken,
        newToken,
      };
    } catch (error) {
      throw error;
    }
  }

  public walletPasswordRequired() {
    logger.debug(
      `resolvers.auth.walletPasswordRequired.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`,
    );
    return config.clientSecretKeyRequired;
  }

  public async getGameJWT(parent: any, args: any, { user }: Context) {
    this.requireAuth(user);

    const token = await galaGamingApiService.getGameJWT(user.userId);

    return { token };
  }
}

const resolvers = new Resolvers();

export default {
  ReturnToken: {
    profile: userResolver.getUserProfile,
  },
  ValidateExistingTokenResponse: {
    profile: userResolver.getUserProfile,
  },
  Query: {
    twoFaValidate: resolvers.twoFaValidate,
    validateExistingToken: resolvers.validateExistingToken,
    walletPasswordRequired: resolvers.walletPasswordRequired,
    gameJWT: resolvers.getGameJWT,
  },
  Mutation: {
    login: resolvers.login,
    twoFaRegister: resolvers.twoFaRegister,
    disableTwoFa: resolvers.disableTwoFa,
  },
};
