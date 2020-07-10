import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import config from '../common/config';
import { User, FriendNudge } from '../models';
import { getPipeline as getAllowedToNudgePipeline } from '../pipelines/allowed_to_nudge_friend';
import { getPipeline as getFriendsPipeline } from '../pipelines/get_friends';

class Resolvers extends ResolverBase {
  private async verifyNudgableFriend(userId: string, friend: string) {
    const pipeline = getAllowedToNudgePipeline(
      userId,
      friend,
      config.nudgeCode,
    );

    const [result] = await User.aggregate(pipeline);

    return result;
  }

  public getFriends = async (parent: any, args: {}, { user }: Context) => {
    this.requireAuth(user);

    const pipeline = getFriendsPipeline(user.userId);
    const friends = await User.aggregate(pipeline);

    return friends;
  };

  public nudgeFriend = async (
    parent: any,
    { id }: { id: string },
    { user, dataSources }: Context,
  ) => {
    this.requireAuth(user);

    const { isFriend, allowedToNudge, email } = await this.verifyNudgableFriend(
      user.userId,
      id,
    );

    if (!isFriend) {
      return {
        success: false,
        message: `Not your friend`,
      };
    }

    if (!allowedToNudge) {
      return {
        success: false,
        message: `Already nudged`,
      };
    }

    await FriendNudge.create({
      code: config.nudgeCode,
      userId: user.userId,
      friend: id,
    });
    await dataSources.sendEmail.nudgeFriend(user, email);

    return { success: true };
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    friends: resolvers.getFriends,
  },
  Mutation: {
    nudgeFriend: resolvers.nudgeFriend,
  },
};
