import { auth, config } from '../common';
import { Context, IUserClaims } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
import { UserApi } from '../data-sources/';
import { credentialService } from '../services';
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

  private async verifyWalletCredentialsExist(userId: string) {
    try {
      const walletCredentials = await Promise.all([
        credentialService.get(userId, 'BTC', 'token'),
        credentialService.get(userId, 'ETH', 'privateKey'),
      ]);
      if (walletCredentials.length) return true;
    } catch (error) {
      return false
    }
  }

  private async setupTwoFa(claims: IUserClaims, userApi: UserApi): Promise<ITwoFaSetup> {
    try {
      let secret: string | null = null;
      let qrCode: string | null
      if (!claims.twoFaEnabled) {
        const { qrCode: userQrCode, secret: userSecret } = await userApi.setTempTwoFaSecret();
        secret = userSecret;
        qrCode = userQrCode
      }
      return {
        twoFaSecret: secret,
        twoFaQrCode: qrCode
      }
    } catch (error) {
      console.log(error);
    }
  }

  public async login(
    parent: any,
    args: { token: string },
    { user }: Context
  ) {
    const token = await auth.signIn(args.token, config.hostname);
    const { claims } = auth.verifyAndDecodeToken(token, config.hostname);
    const tempUserApi = new UserApi(claims);
    const walletExists = await this.verifyWalletCredentialsExist(claims.userId)
    const twoFaSetup = await this.setupTwoFa(claims, tempUserApi);
    return {
      userApi: tempUserApi,
      twoFaEnabled: claims.twoFaEnabled,
      token,
      walletExists,
      walletPasswordRequired: config.clientSecretKeyRequired,
      ...twoFaSetup,
    };
  }

  public async validateExistingToken(
    parent: any,
    args: {},
    { user }: Context,
  ) {
    this.requireAuth(user);
    const walletExists = await this.verifyWalletCredentialsExist(user.userId)
    const twoFaSetup = await this.setupTwoFa(user, user);
    return {
      userApi: user,
      twoFaEnabled: user.twoFaEnabled,
      authenticated: true,
      walletExists,
      walletPasswordRequired: config.clientSecretKeyRequired,
      ...twoFaSetup,
    }
  }

  public async twoFaRegister(parent: any, args: {}, { user }: Context) {
    this.requireAuth(user);
    const { twoFaSecret } = await user.findFromDb();
    if (twoFaSecret) {
      throw new ApolloError('Two Factor Authentication is already set up.');
    }
    const { qrCode, secret } = await user.setTempTwoFaSecret();

    return { twoFaQrCode: qrCode, twoFaSecret: secret };
  }

  public async twoFaValidate(
    parent: any,
    args: { totpToken: string },
    { user, req }: Context,
  ) {
    this.requireAuth(user);
    const token = req.headers.authorization
      ? req.headers.authorization.replace('Bearer ', '')
      : '';
    const { authenticated, newToken } = await auth.validateTwoFa(
      config.hostname,
      token,
      args.totpToken,
    );

    return { authenticated, newToken };
  }

  async getUserProfile(
    { userApi }: { userApi: UserApi },
  ) {
    const profile = await userApi.findFromDb();
    return profile;
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
    validateExistingToken: resolvers.validateExistingToken
  },
  Mutation: {
    login: resolvers.login,
    twoFaRegister: resolvers.twoFaRegister,
  },
};
