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
    { coinSymbol }: { coinSymbol?: string },
    { user, dataSources: { wallet } }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getBalance(user);
      return [walletResult];
    }
    const allWalletApi = wallet.allCoins();
    const walletData = await Promise.all(
      allWalletApi.map(walletCoinApi => walletCoinApi.getBalance(user)),
    );
    return walletData;
  }

  async getTransactions(
    { symbol }: { accountId: string; symbol: string },
    args: any,
    { user, domain, dataSources: { wallet, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const transactions = await walletApi.getTransactions(user);
    return transactions;
  }

  async estimateFee(
    { symbol }: { symbol: string },
    args: any,
    { user, dataSources: { wallet } }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const feeEstimate = await walletApi.estimateFee();
    return feeEstimate;
  }

  async sendTransaction(
    parent: any,
    {
      coinSymbol,
      to,
      amount,
    }: { coinSymbol: string; accountId: string; to: string; amount: string },
    { user, domain, dataSources: { wallet, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(coinSymbol);
    const result = await walletApi.send(user, to, amount);
    return result;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    wallet: resolvers.getWallet,
  },
  Wallet: {
    transactions: resolvers.getTransactions,
    feeEstimate: resolvers.estimateFee,
  },
  Mutation: {
    sendTransaction: resolvers.sendTransaction,
  },
};
