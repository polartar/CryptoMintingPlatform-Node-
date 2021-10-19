import { Context } from '../types';
import ResolverBase from '../common/Resolver-Base';
import config from '../common/config';
import { User, FriendNudge } from '../models';
import { getPipeline as getAllowedToNudgePipeline } from '../pipelines/allowed_to_nudge_friend';
import { getPipeline as getFriendsPipeline } from '../pipelines/get_friends';
import { getPipeline as getNudgableFriendsPipeline } from '../pipelines/nudgable_friends';

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

    const {
      isFriend,
      allowedToNudge,
      email,
      firstName,
      referralLink,
      emailVerified,
    } = await this.verifyNudgableFriend(user.userId, id);

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

    if (!emailVerified) {
      return {
        success: false,
        message: `Friend has not verified their email address`,
      };
    }

    const referrer = await user.findFromDb();

    await FriendNudge.create({
      code: config.nudgeCode,
      userId: user.userId,
      friend: id,
      created: new Date(),
      updated: null,
    });
    // await dataSources.galaEmailer.sendNudgeFriendEmail(
    //   email,
    //   !!emailVerified,
    //   firstName,
    //   referrer.firstName,
    //   referralLink,
    // );

    return { success: true };
  };

  public nudgeAllFriends = async (
    parent: any,
    args: {},
    { user, dataSources }: Context,
  ) => {
    this.requireAuth(user);

    const pipeline = getNudgableFriendsPipeline(user.userId, config.nudgeCode);
    const nudgableFriends: Array<{
      referrer: string;
      firstName: string;
      email: string;
      referralLink: string;
      userId: string;
      communicationConsent: Array<{
        timestamp: Date;
        consentGiven: boolean;
      }>;
      emailVerified: Date;
    }> = await User.aggregate(pipeline);

    const nudges = await Promise.all(
      nudgableFriends.map(async ({ referrer, ...friend }) => {
        // await dataSources.galaEmailer.sendNudgeFriendEmail(
        //   friend.email,
        //   !!friend.emailVerified,
        //   friend.firstName,
        //   referrer,
        //   friend.referralLink,
        // );

        return new FriendNudge({
          code: config.nudgeCode,
          userId: user.userId,
          friend: friend.userId,
        });
      }),
    );

    await FriendNudge.insertMany(nudges);

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
    nudgeAllFriends: resolvers.nudgeAllFriends,
  },
};
