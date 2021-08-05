import ResolverBase from '../common/Resolver-Base';
import { logger } from '../common';
import { Context } from '../types';
import { BlockbotReportResult } from '../models';

class Resolvers extends ResolverBase {

  getBlockbotReport = async (
    parent: any,
    args: {},
    ctx: Context
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    try {
      logger.debug(`resolvers.blockbot.getBlockBotReport`);
      const userId = user.userId;

      const twoDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 2;

      const latestReport = await BlockbotReportResult.find({
        UserId: userId,
        DatePrepared: { $gt: twoDaysAgo },
      }).exec();

      //TODO : this can be replaced with a proper projection in mongo query.
      //Doing this loop to find the latest in the last 2 days
      let result = { DatePrepared: new Date().setTime(0) };
      latestReport.forEach(report => {
        if (result.DatePrepared < report.DatePrepared) {
          result = report;
        }
      });

      return result;
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
