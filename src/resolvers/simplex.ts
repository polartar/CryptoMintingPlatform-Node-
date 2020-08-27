import ResolverBase from '../common/Resolver-Base';
import { simplexJwtService } from '../services';
import { SimplexCryptoCurrency, SimplexFiatCurrency, Context } from '../types';

class Resolvers extends ResolverBase {
  public getQuote = async (
    parent: any,
    args: {
      simplexQuoteInput: {
        sourceAmount: number;
        sourceCurrency: SimplexCryptoCurrency;
        targetCurrency: SimplexFiatCurrency;
        clientIp: string;
      };
    },
    { user }: Context,
  ) => {
    this.requireAuth(user);
    const quote = await simplexJwtService.getQuote(args.simplexQuoteInput);
    return quote;
  };

  public getBuyUrl = async (
    parent: any,
    args: {
      simplexBuyUrlInput: {
        cryptoAddress: string;
        cryptoCurrency: SimplexCryptoCurrency;
        fiatCurrency: SimplexFiatCurrency;
        fiatAmount: number;
      };
    },
    { user }: Context,
  ) => {
    this.requireAuth(user);
    const buyUrl = await simplexJwtService.buyCryptoUrl({
      ...args.simplexBuyUrlInput,
      userId: user.userId,
    });
    return { url: buyUrl };
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    simplexQuote: resolvers.getQuote,
    simplexBuyUrl: resolvers.getBuyUrl,
  },
};
