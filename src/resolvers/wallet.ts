import { logger } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import account from './account';
import { IWalletAccount } from '../models/walletAccount';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }
  async getWallet(
    parent: any,
    { coinSymbol }: { coinSymbol: string },
    { user, domain, dataSources: { wallet, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const userApi = userModel.domain(domain).user(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getBalance(userApi);
      return [walletResult];
    }
    const allWalletApi = wallet.allCoins();
    const walletData = await Promise.all(
      allWalletApi.map(walletCoinApi => walletCoinApi.getBalance(userApi)),
    );
    return walletData;
  }

  async getTransactions(
    { symbol }: { accountId: string; symbol: string },
    args: any,
    { user, domain, dataSources: { wallet, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const userApi = userModel.domain(domain).user(user);
    const walletApi = wallet.coin(symbol);
    const transactions = await walletApi.getTransactions(userApi);
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
    const userApi = userModel.domain(domain).user(user);
    const walletApi = wallet.coin(coinSymbol);
    const result = await walletApi.send(userApi, to, amount);
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
