import { config, logger } from '../common';
import { Context } from '../types/context';
import {} from '../types/user';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import ResolverBase from '../common/Resolver-Base';
const autoBind = require('auto-bind');
class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  async getUserAccounts(
    parent: any,
    args: {},
    { user, dataSources: { accounts } }: Context,
  ) {
    this.requireAuth(user);
    const userAccounts = await accounts.findByUserId(user.userId);
    return userAccounts;
  }

  async createAccount(
    parent: any,
    args: { accountName: string },
    { user, dataSources: { accounts } }: Context,
  ) {
    this.requireAuth(user);
    const newAccount = await accounts.createAccount(
      user.userId,
      args.accountName,
    );
    return newAccount;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    accounts: resolvers.getUserAccounts,
  },
  Mutation: {
    createAccount: resolvers.createAccount,
  },
};
