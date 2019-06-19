import { auth } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { ApolloError } from 'apollo-server-express';
const autoBind = require('auto-bind');
class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  public async login(
    parent: any,
    args: { token: string },
    { domain }: Context,
  ) {
    const token = await auth.signIn(args.token, domain);
    return { token };
  }

  public async twoFaRegister(parent: any, args: {}, { user }: Context) {
    this.requireAuth(user);
    const { twoFaSecret } = await user.findFromDb();
    if (twoFaSecret) {
      throw new ApolloError('Two Factor Authentication is already set up.');
    }
    const qrCode = await user.setTempTwoFaSecret();

    return { qrCode };
  }

  public async twoFaValidate(
    parent: any,
    args: { totpToken: string },
    { user }: Context,
  ) {
    this.requireAuth(user);
    const authenticated = await user.validateTwoFa(args.totpToken);
    return { authenticated };
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
