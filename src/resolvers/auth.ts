import { auth } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
import { UserApi } from '../data-sources/';
const autoBind = require('auto-bind');
class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async login(
    parent: any,
    args: { token: string },
    { domain, user }: Context,
  ) {
    const token = await auth.signIn(args.token, domain);
    const decodedToken = auth.verifyAndDecodeToken(token, domain);
    const { claims } = decodedToken;
    const tempUserApi = new UserApi(domain, claims);
    const twoFaSetup: { twoFaQrCode?: string; twoFaSecret?: string } = {};
    if (!claims.twoFaEnabled) {
      const { qrCode, secret } = await tempUserApi.setTempTwoFaSecret();
      twoFaSetup.twoFaSecret = secret;
      twoFaSetup.twoFaQrCode = qrCode;
    }
    return { token, twoFaEnabled: claims.twoFaEnabled, ...twoFaSetup };
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
    { user, req, domain }: Context,
  ) {
    this.requireAuth(user);
    const token = req.headers.authorization
      ? req.headers.authorization.replace('Bearer ', '')
      : '';
    const { authenticated, newToken } = await auth.validateTwoFa(
      domain,
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
  },
  Mutation: {
    login: resolvers.login,
    twoFaRegister: resolvers.twoFaRegister,
  },
};
