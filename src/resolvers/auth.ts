import { auth } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
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
}

const resolvers = new Resolvers();

export default {
  Query: {},
  Mutation: {
    login: resolvers.login,
  },
};
