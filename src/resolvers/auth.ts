import { auth, config, logger } from '../common';
import { Context, IUserClaims } from '../types/context';
import { WalletApi } from '../wallet-api'
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
import { UserApi } from '../data-sources/';
const autoBind = require('auto-bind');
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
    logger.debug(`resolvers.auth.verifyWalletsExist.userId:${user.userId}`)

    try {
      const walletsExist = await Promise.all(
        wallet.parentInterfaces.map(parentCoin => parentCoin.checkIfWalletExists(user))
      );
      logger.debug(`resolvers.auth.verifyWalletsExist.walletsExist:${walletsExist}`)
      const bothWalletsExist = walletsExist.every(walletExists => walletExists)
      logger.debug(`resolvers.auth.verifyWalletsExist.bothWalletsExist:${bothWalletsExist}`)
      return bothWalletsExist
    } catch (error) {
      logger.warn(`resolvers.auth.verifyWalletsExist.catch:${error}`)
      return false
    }
  }

  private async setupTwoFa(claims: IUserClaims, userApi: UserApi): Promise<ITwoFaSetup> {
    try {
      let secret: string | null = null;
      let qrCode: string | null
      logger.debug(`resolvers.auth.setupTwoFa.claims.twoFaEnabled:${claims.twoFaEnabled}`)

      if (!claims.twoFaEnabled) {
        const { qrCode: userQrCode, secret: userSecret } = await userApi.setTempTwoFaSecret();
        secret = userSecret;
        qrCode = userQrCode
        logger.debug(`resolvers.auth.setupTwoFa.claims.!!secret:${!!secret}`)
        logger.debug(`resolvers.auth.setupTwoFa.claims.!!secret:${!!userQrCode}`)
      }
      return {
        twoFaSecret: secret,
        twoFaQrCode: qrCode
      }
    } catch (error) {
      logger.debug(`resolvers.auth.setupTwoFa.catch:${error}`)
      throw error;
    }
  }

  public async login(
    parent: any,
    args: { token: string },
    { wallet }: Context
  ) {
    try {
      logger.debug(`resolvers.auth.login.!!args.token:${!!args.token}`)
      const token = await auth.signIn(args.token, config.hostname);
      logger.debug(`resolvers.auth.login.!!token:${!!token}`)
      const { claims } = auth.verifyAndDecodeToken(token, config.hostname);
      logger.debug(`resolvers.auth.login.claims.userId:${claims.userId}`)
      const tempUserApi = new UserApi(claims);
      const walletExists = await this.verifyWalletsExist(tempUserApi, wallet)
      logger.debug(`resolvers.auth.login.walletExists:${walletExists}`)
      const twoFaSetup = await this.setupTwoFa(claims, tempUserApi);
      logger.debug(`resolvers.auth.login.!!twoFaSetup.twoFaQrCode:${!!twoFaSetup.twoFaQrCode}`)
      logger.debug(`resolvers.auth.login.!!twoFaSetup.twoFaSecret:${!!twoFaSetup.twoFaSecret}`)
      return {
        userApi: tempUserApi,
        twoFaEnabled: claims.twoFaEnabled,
        token,
        walletExists,
        ...twoFaSetup,
      };
    } catch (error) {
      logger.warn(`resolvers.auth.login.catch:${error}`)
      throw error;
    }
  }

  public async validateExistingToken(
    parent: any,
    args: {},
    { user, req, wallet }: Context,
  ) {
    try {
      logger.debug(`resolvers.auth.validateExistingToken.userId:${user && user.userId}`);
      this.requireAuth(user);
      logger.debug(`resolvers.auth.validateExistingToken.requireAuth:ok`)
      const walletExists = await this.verifyWalletsExist(user, wallet)
      logger.debug(`resolvers.auth.validateExistingToken.walletExists:${walletExists}`);
      const twoFaSetup = await this.setupTwoFa(user, user);
      logger.debug(`resolvers.auth.validateExistingToken.twoFaSetup.twoFaQrCode:${twoFaSetup.twoFaQrCode}`);
      logger.debug(`resolvers.auth.validateExistingToken.twoFaSetup.twoFaSecret:${twoFaSetup.twoFaSecret}`);
      const token = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : '';
      logger.debug(`resolvers.auth.validateExistingToken.!!token:${!!token}`);
      const twoFaAuthenticated = await auth.verifyTwoFaAuthenticated(token, config.hostname)
      logger.debug(`resolvers.auth.validateExistingToken.twoFaAuthenticated:${twoFaAuthenticated}`);
      return {
        userApi: user,
        twoFaEnabled: user.twoFaEnabled,
        twoFaAuthenticated,
        walletExists,
        ...twoFaSetup,
      }
    } catch (error) {
      logger.warn(`resolvers.auth.validateExistingToken.catch:${error}`);
      throw error;
    }
  }

  public async twoFaRegister(parent: any, args: {}, { user }: Context) {
    try {
      logger.debug(`resolvers.auth.twoFaRegister.userId:${user && user.userId}`);
      this.requireAuth(user);
      logger.debug(`resolvers.auth.twoFaRegister.requireAuth:ok`);
      const { twoFaSecret } = await user.findFromDb();
      logger.debug(`resolvers.auth.twoFaRegister.requireAuth.twoFaSecret:${twoFaSecret}`);
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
    { user, req }: Context,
  ) {
    try {
      logger.debug(`resolvers.auth.twoFaValidate.userId:${user && user.userId}`);
      this.requireAuth(user);
      logger.debug(`resolvers.auth.twoFaValidate.requireAuth:ok`);
      const token = req.headers.authorization
        ? req.headers.authorization.replace('Bearer ', '')
        : '';
      logger.debug(`resolvers.auth.twoFaValidate.!!token:${!!token}`);
      const { authenticated, newToken } = await auth.validateTwoFa(
        config.hostname,
        token,
        args.totpToken,
      );
      logger.debug(`resolvers.auth.twoFaValidate.authenticated:${authenticated}`);
      logger.debug(`resolvers.auth.twoFaValidate.!!newToken:${!!newToken}`);
      return { authenticated, newToken };
    } catch (error) {
      logger.warn(`resolvers.auth.twoFaValidate.catch:${error}`);
      throw error;
    }
  }

  async getUserProfile(
    { userApi }: { userApi: UserApi },
  ) {
    logger.debug(`resolvers.auth.getUserProfile.userId:${userApi.userId}`);
    const profile = await userApi.findFromDb();
    return profile;
  }

  public walletPasswordRequired() {
    logger.debug(`resolvers.auth.walletPasswordRequired.config.clientSecretKeyRequired:${config.clientSecretKeyRequired}`);
    return config.clientSecretKeyRequired
  }
}

const resolvers = new Resolvers();

export default {
  ReturnToken: {
    profile: resolvers.getUserProfile,
  },
  ValidateExistingTokenResponse: {
    profile: resolvers.getUserProfile,
  },
  Query: {
    twoFaValidate: resolvers.twoFaValidate,
    validateExistingToken: resolvers.validateExistingToken,
    walletPasswordRequired: resolvers.walletPasswordRequired
  },
  Mutation: {
    login: resolvers.login,
    twoFaRegister: resolvers.twoFaRegister,
  },
};
