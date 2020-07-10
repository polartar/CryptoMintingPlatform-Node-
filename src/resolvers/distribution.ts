import { startOfDay, endOfDay } from 'date-fns';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import User from '../models/user';
import { getPipeline } from '../pipelines/get_distribution_data';

class Resolvers extends ResolverBase {
  getDistributionDataByEmail = async (
    parent: any,
    { email, date }: { email: string; date: Date },
    { user }: Context,
  ) => {
    this.requireAdmin(user);

    const startOfDate = startOfDay(date);
    const endOfDate = endOfDay(date);
    const pipeline = getPipeline(email, startOfDate, endOfDate);

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
}

const resolvers = new Resolvers();

export default {
  Query: {
    distributionData: resolvers.getDistributionDataByEmail,
  },
};
