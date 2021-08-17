import { config, logger, ResolverBase } from 'src/common';
import { Context } from 'src/types/context';
import { Bitly } from 'src/data-sources';
import { AffiliateAction, AffiliateLink } from 'src/models';

class Resolvers extends ResolverBase {
  private bitly = new Bitly();

  logAffiliateVisit = async (
    parent: any,
    args: {
      affiliateId: string;
      sessionId: string;
      url: string;
    },
    ctx: Context
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
  }

  affiliateLink = async (parent: any, args: { affiliateId: string }, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);

    const affiliateLink = await AffiliateLink.findById(args.affiliateId);
    return affiliateLink;
  }

  assignReferredBy = async (parent: any, args: {
    affiliateId: string;
    sessionId: string
  }, ctx: Context) => {
    try {
      const { user } = ctx;
      this.requireAuth(user);

      const userDoc = await user.findFromDb();

      if (!userDoc.referredByLocked) {
        const affiliateLink = await AffiliateLink.findById(args.affiliateId);
        userDoc.referredBy = affiliateLink.userId;
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
  }

  createAffiliateLink = async (
    parent: any,
    args: {
      pageUrl: string;
      name: string;
      brand: string
    },
    ctx: Context
  ) => {
    const { user } = ctx;
    this.requireAuth(user);

    const bitlyLink = await this.bitly.shortenLongUrl(args.pageUrl, config.bitlyGuid);

    const affiliateLink = new AffiliateLink({
      pageUrl: args.pageUrl,
      name: args.name,
      brand: args.brand,
      userId: user.userId,
      bitlyLink: bitlyLink,
    });

    await affiliateLink.save();

    return affiliateLink;
  }
}

const resolvers = new Resolvers();

export default {
  Query: {
    logAffiliateVisit: resolvers.logAffiliateVisit,
    affiliateLink: resolvers.affiliateLink,
  },
  Mutation: {
    assignReferredBy: resolvers.assignReferredBy,
    createAffiliateLink: resolvers.createAffiliateLink,
  }
};
