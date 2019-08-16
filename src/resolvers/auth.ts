import { auth, config } from '../common';
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
    const btc = wallet.coin('btc');
    const eth = wallet.coin('eth');
    try {
      const walletCredentials = await Promise.all([
        btc.checkIfWalletExists(user),
        eth.checkIfWalletExists(user)
      ]);
      return walletCredentials.every(cred => cred)
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
    { wallet }: Context
  ) {
    console.log('wallet', wallet)
    console.log('auth', auth);
    const token = await auth.signIn(args.token, config.hostname);
    console.log('token', typeof token, token.length)
    const { claims } = auth.verifyAndDecodeToken(token, config.hostname);
    console.log('claims', typeof claims, Object.keys(claims).length)
    const tempUserApi = new UserApi(claims);
    console.log('tempUserApi');
    const walletExists = await this.verifyWalletsExist(tempUserApi, wallet)
    console.log("LOG: Resolvers -> walletExists", walletExists)
    const twoFaSetup = await this.setupTwoFa(claims, tempUserApi);
    console.log('twoFaSetup', Object.keys(twoFaSetup))
    return {
      userApi: tempUserApi,
      twoFaEnabled: claims.twoFaEnabled,
      token,
      walletExists,
      ...twoFaSetup,
    };
  }

  public async validateExistingToken(
    parent: any,
    args: {},
    { user, req, wallet }: Context,
  ) {
    this.requireAuth(user);
    const walletExists = await this.verifyWalletsExist(user, wallet)
    const twoFaSetup = await this.setupTwoFa(user, user);
    const token = req.headers.authorization
      ? req.headers.authorization.replace('Bearer ', '')
      : '';
    const twoFaAuthenticated = await auth.verifyTwoFaAuthenticated(token, config.hostname)
    return {
      userApi: user,
      twoFaEnabled: user.twoFaEnabled,
      twoFaAuthenticated,
      walletExists,
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
