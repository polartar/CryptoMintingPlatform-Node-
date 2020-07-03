import { auth, config } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';
import { walletApi } from '../wallet-api';
import { User } from '../models';
import { UserApi } from '../data-sources';
import { CoinWalletBase } from '../wallet-api/coin-wallets';

class Resolvers extends ResolverBase {
  companyAddresses = new Map<string, string>([
    ['33s4BwY8vUqxbxVK3bbWqkbn3WKevnHtQ8', 'COMPANY: Initial universal'],
    ['3KZasKXTCRAfCek4TqTaK51NAp3opZ5y79', 'COMPANY: Gala'],
    ['3316Wkcuvvo11uyZfYQK2fMh1xiHEM6QA9', 'COMPANY: Green'],
    ['3LPwNYUdpmQC4NoTxzh3DNsqfBuRA5Qeqp', 'COMPANY: Connect'],
    ['36xY8vmdh9AmxQChxnfWb2LNfUAqnEddfF', 'COMPANY: Codex'],
    ['3GPCjYyAAk1ovSFVAB1U8KEdPPN9y8psnF', 'COMPANY: Gala(old)'],
    ['3EanQSLbuUMTvgxgfWnQtq9Nj5LCLA6mLg', 'COMPANY: Gala Partner'],
    ['mjUuaAzq28dFhsVkCPAdwnRPEBjLV5ULyE', 'COMPANY: Green Stage'],
    ['miB9jTU6766SNVXpeTRjXKbkCohtjznsyA', 'COMPANY: WinX Stage'],
    ['mxPdb8Gu8dBg6K1Hpqzphkhu57mbz4aPcV', 'COMPANY: Gala Stage'],
    ['0x485Aff1d0D6947C009e43e7caE487dD596409dA3', 'COMPANY: Mixed Stage'],
    ['0xF0059c08498F169CD846d45badC9c666e384480A', 'COMPANY: Connect'],
    ['0x2FDf5bCeC96203a1456cC71E5E717D0E32F8B8D4', 'COMPANY: Green'],
    ['0xba7A8e84c594B24aA227441bf1C5A4E9c7893725', 'COMPANY: Codex'],
    ['0xC34817cb7333050893756fE0BF84950eD8741e40', 'COMPANY: Gala'],
  ]);

  getImpersonationToken = async (
    parent: any,
    args: { userId: string },
    { user }: Context,
  ) => {
    this.requireAdmin(user);
    const token = await auth.signInAs(user.token, args.userId, config.hostname);

    return { token };
  };

  getApiKeyServiceResource = async (
    parent: any,
    args: { userId: string; coin: string; resourceKey: string },
    { user }: Context,
  ): Promise<{ resource: string | null; error?: string }> => {
    this.requireAdmin(user);
    try {
      const resource = await credentialService.get(
        args.userId,
        args.coin,
        args.resourceKey,
      );

      return { resource };
    } catch (error) {
      return { resource: null, error: error.message };
    }
  };

  private getWalletFromCoinConfig = async (
    coin: CoinWalletBase,
    userApi: UserApi,
  ) => {
    const [walletInfo, balance] = await Promise.all([
      coin.getWalletInfo(userApi),
      coin.getBalance(userApi.userId),
    ]);
    const transactions = await coin.getTransactions(
      walletInfo.lookupTransactionsBy,
    );
    const tx: any = {
      ...walletInfo,
      balance,
      transactions: transactions.map(txn => ({
        ...txn,
        to: txn.to.map(toAddress => ({
          address: toAddress,
          knownAddress: this.companyAddresses.get(toAddress),
        })),
      })),
    };
    return tx;
  };

  getUserWalletInfo = async (
    parent: any,
    args: { userId: string; coinSymbol: string },
    { user }: Context,
  ): Promise<any> => {
    this.requireAdmin(user);
    const { userId, coinSymbol } = args;
    const userApi = new UserApi(
      {
        authorized: false,
        permissions: [],
        role: 'member',
        twoFaEnabled: false,
        userId,
      },
      '',
    );

    const ethAddress = (await User.findOne({ id: userId })).wallet?.ethAddress;
    if (!ethAddress) {
      throw Error('No wallet for user');
    }
    if (coinSymbol) {
      const coin = walletApi.coin(coinSymbol);
      const walletResult = await this.getWalletFromCoinConfig(coin, userApi);
      return [walletResult];
    } else {
      return walletApi.allCoins.map(async coin =>
        this.getWalletFromCoinConfig(coin, userApi),
      );
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    getImpersonationToken: resolvers.getImpersonationToken,
    getApiKeyServiceResource: resolvers.getApiKeyServiceResource,
    getWalletByUserId: resolvers.getUserWalletInfo,
  },
};
