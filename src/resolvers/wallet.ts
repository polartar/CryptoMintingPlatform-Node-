import { config, logger } from '../common';
import { Context } from '../types/context';
import { RegisterInput } from '../types/user';
import { AuthenticationError, UserInputError } from 'apollo-server-express';

class Resolvers {
  async getWallet(
    parent: any,
    { coinSymbol }: { coinSymbol: string },
    { user, dataSources: { wallet } }: Context,
  ) {
    if (!user) {
      return new AuthenticationError('User not authenticated');
    }
    if (coinSymbol) {
      const walletApi = wallet[coinSymbol];
      if (!walletApi)
        return new UserInputError(`Wallet for ${coinSymbol} is not supported`);
      const walletResult = await wallet.btc.getBalance(user.userId);
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
