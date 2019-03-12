import { config, logger } from '../common';
import { Context } from '../types/context';
import { RegisterInput } from '../types/user';

class Resolvers {
  async register(
    parent: any,
    { user, idToken }: { user: RegisterInput; idToken: string },
    { dataSources, req, res }: Context,
  ) {
    if (!user || !user.email || !user.firebaseUid) {
      throw new Error('Missing required data');
    }

    const defaults = {
      role: 'user',
      permissions: [] as string[],
      created: new Date(),
    };

    try {
      const newUser = await dataSources.user.create({ ...defaults, ...user });

      try {
        const token = await config.auth.signIn(idToken, req.hostname);
        res.cookie('token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 });
      } catch (error) {
        logger.error(error.stack);
      }

      return newUser;
    } catch (error) {
      logger.error(error.stack);
      throw error;
    }
  }

  async login(
    parent: any,
    { idToken }: { idToken: string },
    { req, res }: Context,
  ) {
    if (!idToken) {
      throw new Error('Missing required data');
    }

    try {
      const token = await config.auth.signIn(idToken, req.hostname);
      res.cookie('token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 });
      return true;
    } catch (error) {
      logger.error(error.stack);
      throw error;
    }
  }

  async getCurrentUser(parent: any, args: {}, { user, dataSources }: Context) {
    if (!user) {
      throw new Error('User not signed in');
    }

    try {
      const res = await dataSources.user.findById(user.userId);
      return res;
    } catch (error) {
      logger.error(error.stack);
      throw error;
    }
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    login: resolvers.login,
    getCurrentUser: resolvers.getCurrentUser,
  },
  Mutation: {
    register: resolvers.register,
  },
};
