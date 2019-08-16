import { auth, config } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
import { UserApi } from '../data-sources/';
import { credentialService } from '../services';
const autoBind = require('auto-bind');
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

  public async login(
    parent: any,
    args: { token: string },
  ) {
    const token = await auth.signIn(args.token, config.hostname);
    const { claims } = auth.verifyAndDecodeToken(token, config.hostname);
    const tempUserApi = new UserApi(claims);
    const walletExists = await this.verifyWalletCredentialsExist(claims.userId)
    const twoFaSetup: { twoFaQrCode?: string; twoFaSecret?: string } = {};
    if (!claims.twoFaEnabled) {
      const { qrCode, secret } = await tempUserApi.setTempTwoFaSecret();
      twoFaSetup.twoFaSecret = secret;
      twoFaSetup.twoFaQrCode = qrCode;
    }
    return {
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
    return {
      twoFaEnabled: user.twoFaEnabled,
      authenticated: true,
      walletExists,
      walletPasswordRequired: config.clientSecretKeyRequired
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
}

const resolvers = new Resolvers();

export default {
  Query: {
    twoFaValidate: resolvers.twoFaValidate,
    validateExistingToken: resolvers.validateExistingToken,
    walletPasswordRequired: () => {
      console.log("resolver -> config", config.clientSecretKeyRequired)
      return config.clientSecretKeyRequired
    }
  },
  Mutation: {
    login: resolvers.login,
    twoFaRegister: resolvers.twoFaRegister,
  },
};
