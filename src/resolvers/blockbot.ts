import ResolverBase from '../common/Resolver-Base';
import { logger } from '../common';
import { Context } from '../types';
import { BlockbotReportResult } from '../models';

class Resolvers extends ResolverBase {
  getBlockbotReport = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);
    try {
      logger.debug(`resolvers.blockbot.getBlockBotReport`);
      const userId = user.userId;

      const twoDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 2;

      const latestReport = await BlockbotReportResult.find({
        UserId: userId,
      })
        .sort({ DatePrepared: -1 })
        .limit(1)
        .exec();

      if (latestReport.length >= 1) return latestReport[0];
      else return null;
    } catch (err) {
      logger.warn(`resolvers.blockbot.getBlockBotReport.catch: ${err}`);
      return {
        success: false,
        message: err,
      };
    }
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    getBlockbotReport: resolvers.getBlockbotReport,
  },
};
