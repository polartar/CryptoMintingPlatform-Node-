import { config, logger, ResolverBase } from 'src/common';
import { Context } from 'src/types/context';
import { Bitly } from 'src/data-sources';
import { AffiliateAction, AffiliateLink, AffiliateLinkUser } from 'src/models';

class Resolvers extends ResolverBase {
  private bitly = new Bitly();

  logAffiliateVisit = async (
    parent: any,
    args: {
      affiliateId: string;
      sessionId: string;
      url: string;
    },
    ctx: Context,
  ) => {
    try {
      const affiliateAction = new AffiliateAction({
        affiliateId: args.affiliateId,
        sessionId: args.sessionId,
        url: args.url,
      });

      await affiliateAction.save();

      return { data: true };
    } catch (error) {
      logger.warn(`resolvers.affiliate.logAffiliateVisit.catch:${error}`);
      return { data: false, error: error };
    }
  };

  affiliateLink = async (
    parent: any,
    args: { affiliateId: string },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);

    const affiliateLink = await AffiliateLink.findById(args.affiliateId).exec();
    return affiliateLink;
  };

  userAffiliateLinks = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);

    const affiliateLinksUser = await AffiliateLinkUser.find({
      userId: user.userId,
    }).exec();
    return affiliateLinksUser;
  };

  assignReferredBy = async (
    parent: any,
    args: {
      affiliateId: string;
      sessionId: string;
    },
    ctx: Context,
  ) => {
    try {
      const { user } = ctx;
      this.requireAuth(user);

      const userDoc = await user.findFromDb();

      if (!userDoc.referredByLocked) {
        const affiliateLinkUser = await AffiliateLinkUser.findOne({
          affiliateLinkId: args.affiliateId,
        }).exec();
        userDoc.referredBy = affiliateLinkUser.userId;
        userDoc.referredByLocked = true;
        userDoc.affiliate = {
          affiliateId: args.affiliateId,
          sessionId: args.sessionId,
        };

        await userDoc.save();
      }

      return { data: true };
    } catch (error) {
      logger.warn(`resolvers.affiliate.logAffiliateVisit.catch:${error}`);
      return { data: false, error: error };
    }
  };

  createAffiliateLink = async (
    parent: any,
    args: {
      pageUrl: string;
      name: string;
      brand: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);

    const affiliateLink = new AffiliateLink({
      pageUrl: args.pageUrl,
      name: args.name,
      brand: args.brand,
    });

    await affiliateLink.save();

    return affiliateLink;
  };

  addAffiliateLinkToUser = async (
    parent: any,
    args: {
      affiliateLinkId: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);

    const affiliateLink = await AffiliateLink.findById(
      args.affiliateLinkId,
    ).exec();
    const bitlyLink = await this.bitly.shortenLongUrl(
      affiliateLink.pageUrl,
      config.bitlyGuid,
    );

    const affiliateLinkUser = new AffiliateLinkUser({
      userId: user.userId,
      affiliateLinkId: args.affiliateLinkId,
      bitlyLink: bitlyLink,
      longLink: affiliateLink.pageUrl,
      created: new Date(),
    });

    await affiliateLinkUser.save();

    return affiliateLinkUser;
  };
}

const resolvers = new Resolvers();

export default {
  Query: {
    logAffiliateVisit: resolvers.logAffiliateVisit,
    affiliateLink: resolvers.affiliateLink,
    userAffiliateLinks: resolvers.userAffiliateLinks,
  },
  Mutation: {
    assignReferredBy: resolvers.assignReferredBy,
    createAffiliateLink: resolvers.createAffiliateLink,
    addAffiliateLinkToUser: resolvers.addAffiliateLinkToUser,
  },
};
