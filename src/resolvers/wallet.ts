import { logger } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { UserInputError } from 'apollo-server-express';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }
  async getWallet(
    parent: any,
    { coinSymbol, accountId }: { coinSymbol: string; accountId: string },
    { user, dataSources: { wallet, accounts } }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.getCoinAPI(coinSymbol);
      if (!walletApi)
        return new UserInputError(`Wallet for ${coinSymbol} is not supported`);
      const walletResult = await walletApi.getBalance(accountId);
      return [walletResult];
    }
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    wallet: resolvers.getWallet,
  },
};
