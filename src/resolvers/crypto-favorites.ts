import { Context } from '../types/context';
import { logger } from '../common'
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
    { user, dataSources: { cryptoFavorites } }: Context,
  ) {
    try {
      logger.debug(`resolvers.crypto-favorites.getFavorites.userId:${user && user.userId}`)
      this.requireAuth(user);
      logger.debug(`resolvers.crypto-favorites.getFavorites.userId:ok`)
      const foundUser = await user.findFromDb();
      logger.debug(`resolvers.crypto-favorites.getFavorites.foundUser.id:${foundUser.id}`)
      const { wallet } = foundUser;
      logger.debug(`resolvers.crypto-favorites.getFavorites.foundUser.wallet:${wallet && wallet.id}`)
      if (!wallet) {
        const updatedUser = await user.setWalletAccountToUser();
        logger.debug(`resolvers.crypto-favorites.getFavorites.foundUser.wallet.!!updatedUser:${!!updatedUser}`)
        const favoritesFullData = await cryptoFavorites.getUserFavorites(
          updatedUser.wallet.cryptoFavorites,
        );
        logger.debug(`resolvers.crypto-favorites.getFavorites.foundUser.wallet.favoritesFullData.length:${favoritesFullData.length}`)
        return favoritesFullData;
      }
      const userFavoritesFullData = await cryptoFavorites.getUserFavorites(
        wallet.cryptoFavorites,
      );
      logger.debug(`resolvers.crypto-favorites.getFavorites.foundUser.wallet.userFavoritesFullData.length:${userFavoritesFullData.length}`)
      return userFavoritesFullData;
    } catch (error) {
      logger.debug(`resolvers.crypto-favorites.getFavorites.catch:${error}`)
      throw error;
    }
  }

  async addFavorite(
    parent: any,
    args: { symbol: string },
    { user, dataSources: { cryptoFavorites } }: Context,
  ) {
    try {
      logger.debug(`resolvers.crypto-favorites.addFavorite.userId:${user && user.userId}`)
      logger.debug(`resolvers.crypto-favorites.addFavorite.args.symbol:${args.symbol}`)
      this.requireAuth(user);
      logger.debug(`resolvers.crypto-favorites.addFavorite.requireAuth:ok`)
      const foundUser = await user.findFromDb();
      logger.debug(`resolvers.crypto-favorites.addFavorite.foundUser.id:${foundUser.id}`)
      const { wallet } = <{ wallet: any }>foundUser;
      wallet.cryptoFavorites.addToSet(args.symbol);
      await foundUser.save();
      logger.debug(`resolvers.crypto-favorites.addFavorite.foundUser.save():done`)
      return cryptoFavorites.getUserFavorites(wallet.cryptoFavorites);
    } catch (error) {
      logger.warn(`resolvers.crypto-favorites.addFavorite.catch:${error}`);
      throw error;
    }
  }

  async removeFavorite(
    parent: any,
    args: { symbol: string },
    { user, dataSources: { cryptoFavorites } }: Context,
  ) {
    try {
      logger.debug(`resolvers.crypto-favorites.removeFavorite.userId:${user && user.userId}`)
      logger.debug(`resolvers.crypto-favorites.removeFavorite.args.symbol:${args.symbol}`)
      this.requireAuth(user);
      logger.debug(`resolvers.crypto-favorites.removeFavorite.requireAuth:ok`)
      const foundUser = await user.findFromDb();
      logger.debug(`resolvers.crypto-favorites.removeFavorite.foundUser.id:${foundUser.id}`)
      const { wallet } = <{ wallet: any }>foundUser;
      wallet.cryptoFavorites.remove(args.symbol);
      await foundUser.save();
      logger.debug(`resolvers.crypto-favorites.removeFavorite.save():done`)
      return cryptoFavorites.getUserFavorites(wallet.cryptoFavorites);
    } catch (error) {
      logger.warn(`resolvers.crypto-favorites.removeFavorite.catch:${error}`)
      throw error;
    }
  }

  getSupportedFavorites = () => {
    logger.debug(`resolvers.crypto-favorites.removeFavorite.save():done`)
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
