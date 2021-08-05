import { auth, config } from '../common';
import { Context } from '../types/context';
import ResolverBase from '../common/Resolver-Base';
import { credentialService } from '../services';
import { walletApi } from '../wallet-api';
import { User } from '../models';
import { UserApi } from '../data-sources';
import { CoinWalletBase } from '../wallet-api/coin-wallets';

class Resolvers extends ResolverBase {
  
  logAffiliateVisit = async (parent: any, args: {}, ctx: Context) => {
    
    return {data: '', error: ''};
  }

  affiliateLink = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);

    //query DB by userId

    return {
      affiliateId: '1',
      pageUrl: 'google.com',
      name: 'google link',
      brand: 'connect',
      userId: 'asdf123',
      fullUrl: 'http://www.google.com',
      bitlyLink: 'bitly.com',
    };

  }

  assignReferredBy = async (parent: any, args: {}, ctx: Context) => {
//    const { user } = ctx;
//    this.requireAuth(user);
// TODO : we can get the user information when IAM plugin is working on wordpress

    return {data: '', error: ''};
  }

  createAffiliateLink = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);

    return {
      affiliateId: '1',
      pageUrl: 'google.com',
      name: 'google link',
      brand: 'connect',
      userId: 'asdf123',
      fullUrl: 'http://www.google.com',
      bitlyLink: 'bitly.com',
    };

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
