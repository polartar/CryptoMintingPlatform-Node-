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
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    if (coinSymbol) {
      const walletApi = wallet.coin(coinSymbol);
      const walletResult = await walletApi.getWalletInfo(user);
      return [walletResult];
    }
    const allWalletApi = wallet.allCoins();
    const walletData = await Promise.all(
      allWalletApi.map(walletCoinApi => walletCoinApi.getWalletInfo(user)),
    );
    return walletData;
  }

  async getBalance(parent: any, args: {}, { user, wallet }: Context) {
    this.requireAuth(user);
    const { symbol, receiveAddress } = parent;
    const userIdOrAddress =
      symbol.toLowerCase() === 'btc' ? user.userId : receiveAddress;
    const walletApi = wallet.coin(symbol);
    const walletResult = await walletApi.getBalance(userIdOrAddress);
    return walletResult;
  }

  async getTransactions(
    { symbol }: { accountId: string; symbol: string },
    args: any,
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const transactions = await walletApi.getTransactions(user);
    return transactions;
  }

  async estimateFee(
    { symbol }: { symbol: string },
    args: any,
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const walletApi = wallet.coin(symbol);
    const feeEstimate = await walletApi.estimateFee(user);
    return feeEstimate;
  }

  async sendTransaction(
    parent: any,
    {
      coinSymbol,
      to,
      amount,
      totpToken,
    }: {
      coinSymbol: string;
      accountId: string;
      to: string;
      amount: string;
      totpToken: string;
    },
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const twoFaValid = await user.validateTwoFa(totpToken);
    this.requireTwoFa(twoFaValid);
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
    balance: resolvers.getBalance,
  },
  Mutation: {
    sendTransaction: resolvers.sendTransaction,
  },
};
