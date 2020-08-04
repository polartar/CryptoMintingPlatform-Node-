import { startOfDay, endOfDay } from 'date-fns';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import User from '../models/user';
import { ProcessLog } from '../models/process-log';
import { DistributionResult } from '../models/distribution-result';
import PromotionalReward from '../models/promotional-rewards';
import { getPipeline as getDistributionDataPipeline } from '../pipelines/get_distribution_data';
import { getPipeline as getDistributionSnapshotPipeline } from '../pipelines/get_distribution_snapshot';
import { getPipeline as getTokenResultsPipeline } from '../pipelines/get_token_results';
import { getPipeline as getDistributionPointsPipeline } from '../pipelines/get_distribution_points';
import { getPipeline as getGlobalDistributionResultsPipeline } from '../pipelines/get_global_distribution_results';

class Resolvers extends ResolverBase {
  getDistributionDataByEmail = async (
    parent: any,
    { email, date }: { email: string; date: Date },
    { user }: Context,
  ) => {
    this.requireAdmin(user);

    const startOfDate = startOfDay(date);
    const endOfDate = endOfDay(date);
    const pipeline = getDistributionDataPipeline(email, startOfDate, endOfDate);

    const [data] = await User.aggregate(pipeline);

    return data as Array<{
      firstName: string;
      lastName: string;
      email: string;
      userId: string;
      totalPoolPoints: number;
      points: Array<{ pointType: string; amount: number }>;
      tokensReceived: Array<{ token: string; amount: number }>;
    }>;
  };

  public getSnapshot = async (parent: any, args: {}, { user }: Context) => {
    this.requireAuth(user);

    const pipeline = getDistributionSnapshotPipeline(user.userId);

    const [snapshot] = await ProcessLog.aggregate(pipeline);

    return snapshot;
  };

  public getTokenResults = async (
    parent: any,
    { date }: { date: Date },
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const pipeline = getTokenResultsPipeline(user.userId, startDate, endDate);

    const results = await DistributionResult.aggregate(pipeline);

    return results;
  };

  public getDistributionPoints = async (
    parent: any,
    { date }: { date: Date },
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const pipeline = getDistributionPointsPipeline(
      user.userId,
      startDate,
      endDate,
    );

    const results = await PromotionalReward.aggregate(pipeline);

    return results;
  };

  public getValidDistributionDates = async (
    parent: any,
    args: {},
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const [earliestResult, lastestResult] = await Promise.all([
      DistributionResult.findOne().sort({ created: 1 }),
      DistributionResult.findOne().sort({ created: -1 }),
    ]);

    return {
      start: earliestResult.created,
      end: lastestResult.created,
    };
  };

  public getGlobalResults = async (
    parent: any,
    { date }: { date: Date },
    { user }: Context,
  ) => {
    this.requireAuth(user);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const pipeline = getGlobalDistributionResultsPipeline(startDate, endDate);

    const results = await DistributionResult.aggregate(pipeline);

    return results;
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    distributionData: resolvers.getDistributionDataByEmail,
    distributionSnapshot: resolvers.getSnapshot,
    distributionResults: resolvers.getTokenResults,
    distributionPoints: resolvers.getDistributionPoints,
    distributionGlobalResults: resolvers.getGlobalResults,
    validDistributionDates: resolvers.getValidDistributionDates,
  },
};
