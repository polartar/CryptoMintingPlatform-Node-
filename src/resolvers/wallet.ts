import { Context } from '../types/context';
import { mnemonic } from '../utils'
import ResolverBase from '../common/Resolver-Base';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  private selectUserIdOrAddress(
    userId: string,
    parent: { symbol: string, receiveAddress: string }) {
    if (parent.symbol.toLowerCase() === 'btc') return userId;
    return parent.receiveAddress;
  }

  // async createWallet(
  //   parent: any,
  //   args: { mnemonic: },
  //   { user, wallet }: Context,
  // ) {

  // }

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
    const { allCoins } = wallet;
    const walletData = await Promise.all(
      allCoins.map(walletCoinApi => walletCoinApi.getWalletInfo(user)),
    );
    return walletData;
  }

  async getBalance(parent: any, args: {}, { user, wallet }: Context) {
    this.requireAuth(user);
    const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent)
    const walletApi = wallet.coin(parent.symbol);
    const walletResult = await walletApi.getBalance(userIdOrAddress);
    return walletResult;
  }

  public generateMnemonic(
    parent: any, args: { lang: string }, { user }: Context
  ) {
    this.requireAuth(user);
    const lang = args.lang || 'en';
    return mnemonic.generateRandom(lang);
  }

  async getTransactions(
    parent: { symbol: string, receiveAddress: string, blockNumAtCreation: number },
    args: any,
    { user, wallet }: Context,
  ) {
    this.requireAuth(user);
    const userIdOrAddress = this.selectUserIdOrAddress(user.userId, parent)
    const walletApi = wallet.coin(parent.symbol);
    const transactions = await walletApi.getTransactions(userIdOrAddress, parent.blockNumAtCreation);
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
    mnemonic: resolvers.generateMnemonic
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
