import { Context } from '../types/context';
import { logger, config } from '../common';
import ResolverBase from '../common/Resolver-Base';
import * as topSupportedCryptoFavorites from '../data/topSupportedFavoriteOptions.json';
import { UserInputError } from 'apollo-server-express';
const autoBind = require('auto-bind');

class Resolvers extends ResolverBase {
  supportedFavorites = topSupportedCryptoFavorites.slice(0, 100);
  supportedFavoritesMap: Map<
    string,
    { symbol: string; name: string }
  > = new Map();
  constructor() {
    super();
    autoBind(this);
    this.supportedFavorites.forEach(fav =>
      this.supportedFavoritesMap.set(fav.symbol, fav),
    );
  }

  async getFavorites(parent: any, args: {}, { user }: Context) {
    try {
      this.requireAuth(user);
      const userFavoriteMap = new Map();
      const foundUser = await user.findFromDb();
      const { wallet } = foundUser;
      if (wallet) {
        wallet.cryptoFavorites.forEach(fav => userFavoriteMap.set(fav, true));
      } else {
        await user.setWalletAccountToUser();
        config.defaultCryptoFavorites.forEach(fav =>
          userFavoriteMap.set(fav, true),
        );
      }
      return topSupportedCryptoFavorites
        .slice(0, 100)
        .map(supportedFavorite => {
          return {
            ...supportedFavorite,
            following: !!userFavoriteMap.get(supportedFavorite.symbol),
          };
        });
    } catch (error) {
      logger.debug(`resolvers.crypto-favorites.getFavorites.catch:${error}`);
      throw error;
    }
  }

  async addFavorite(
    parent: any,
    args: { symbol: string },
    { user, dataSources: { cryptoFavorites } }: Context,
  ) {
    try {
      this.requireAuth(user);
      const favoriteSupported = !!this.supportedFavoritesMap.get(args.symbol);
      if (!favoriteSupported)
        throw new UserInputError(`${args.symbol} not supported as a favorite`);
      const foundUser = await user.findFromDb();
      const { wallet } = <{ wallet: any }>foundUser;
      wallet.cryptoFavorites.addToSet(args.symbol);
      await foundUser.save();
      return {
        success: true,
      };
    } catch (error) {
      logger.warn(`resolvers.crypto-favorites.addFavorite.catch:${error}`);
      throw error;
    }
  }

  async removeFavorite(
    parent: any,
    args: { symbol: string },
    { user }: Context,
  ) {
    try {
      this.requireAuth(user);
      const foundUser = await user.findFromDb();
      const { wallet } = <{ wallet: any }>foundUser;
      wallet.cryptoFavorites.remove(args.symbol);
      await foundUser.save();
      return {
        success: true,
      };
    } catch (error) {
      logger.warn(`resolvers.crypto-favorites.removeFavorite.catch:${error}`);
      throw error;
    }
  }

  getSupportedFavorites = () => {
    return this.supportedFavorites;
  };
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
