import { logger } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import account from './account';
import { IAccount } from '../models/account';
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
    const userAccount = (await accounts.findById(accountId)) as IAccount;
    this.validateAccount(userAccount);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getBalance(userAccount);
      return [walletResult];
    }
    const allWalletApi = wallet.allCoins();
    const walletData = await Promise.all(
      allWalletApi.map(walletCoinApi => walletCoinApi.getBalance(userAccount)),
    );
    return walletData;
  }

  async getTransactions(
    { accountId, symbol }: { accountId: string; symbol: string },
    args: any,
    { user, dataSources: { wallet, accounts } }: Context,
  ) {
    this.requireAuth(user);
    const userAccount = (await accounts.findById(accountId)) as IAccount;
    this.validateAccount(userAccount);
    const walletApi = wallet.coin(symbol);
    const transactions = await walletApi.getTransactions(userAccount);
    return transactions;
  }

  async estimateFee(
    { accountId, symbol }: { accountId: string; symbol: string },
    args: any,
    { user, dataSources: { wallet, accounts } }: Context,
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
      accountId,
      to,
      amount,
    }: { coinSymbol: string; accountId: string; to: string; amount: number },
    { user, dataSources: { wallet, accounts } }: Context,
  ) {
    this.requireAuth(user);
    const userAccount = (await accounts.findById(accountId)) as IAccount;
    this.validateAccount(userAccount);
    const walletApi = wallet.coin(coinSymbol);
    const result = await walletApi.send(userAccount, to, amount);
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
