import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
const autoBind = require('auto-bind');
import * as supportedCryptoFavorites from '../data/supportedFavoriteOptions.json';

class Resolvers extends ResolverBase {
  constructor() {
    super();
    autoBind(this);
  }

  async getFavorites(
    parent: any,
    args: {},
    { user, domain, dataSources: { cryptoFavorites, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const userApi = userModel.domain(domain).user(user);

    const foundUser = await userApi.findById();
    const { wallet } = foundUser;
    if (!wallet) {
      const updatedUser = await userApi.setWalletAccountToUser();
      const favoritesFullData = await cryptoFavorites.getUserFavorites(
        updatedUser.wallet.cryptoFavorites,
      );
      return favoritesFullData;
    }
    const userFavoritesFullData = await cryptoFavorites.getUserFavorites(
      wallet.cryptoFavorites,
    );
    return userFavoritesFullData;
  }

  async addFavorite(
    parent: any,
    args: { symbol: string },
    { user, domain, dataSources: { cryptoFavorites, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const userApi = userModel.domain(domain).user(user);
    const foundUser = await userApi.findById();
    const { wallet } = <{ wallet: any }>foundUser;
    wallet.cryptoFavorites.addToSet(args.symbol);
    await foundUser.save();
    return cryptoFavorites.getUserFavorites(wallet.cryptoFavorites);
  }

  async removeFavorite(
    parent: any,
    args: { symbol: string },
    { user, domain, dataSources: { cryptoFavorites, userModel } }: Context,
  ) {
    this.requireAuth(user);
    const userApi = userModel.domain(domain).user(user);
    const foundUser = await userApi.findById();
    const { wallet } = <{ wallet: any }>foundUser;
    wallet.cryptoFavorites.remove(args.symbol);
    await foundUser.save();
    return cryptoFavorites.getUserFavorites(wallet.cryptoFavorites);
  }

  getSupportedFavorites(parent: any, args: {}, { user }: Context) {
    this.requireAuth(user);
    return supportedCryptoFavorites;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    favorites: resolvers.getFavorites,
    supportedFavorites: resolvers.getSupportedFavorites,
  },
  Mutation: {
    addFavorite: resolvers.addFavorite,
    removeFavorite: resolvers.removeFavorite,
  },
};
