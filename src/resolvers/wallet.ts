import { logger } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }
  async getWallet(
    parent: any,
    { coinSymbol, accountId }: { coinSymbol: string; accountId: string },
    { user, dataSources: { wallet } }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getBalance(accountId);
      return [walletResult];
    }
  }

  async getTransactions(
    { accountId, symbol }: { accountId: string; symbol: string },
    args: any,
    { user, dataSources: { wallet } }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const transactions = await walletApi.getTransactions(accountId);
    return transactions;
  }

  async sendTransaction(
    parent: any,
    {
      coinSymbol,
      accountId,
      to,
      amount,
    }: { coinSymbol: string; accountId: string; to: string; amount: number },
    { user, dataSources: { wallet } }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const result = await walletApi.send(accountId, to, amount);
      return result;
    }
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    wallet: resolvers.getWallet,
  },
  Wallet: {
    transactions: resolvers.getTransactions,
  },
  Mutation: {
    sendTransaction: resolvers.sendTransaction,
  },
};
