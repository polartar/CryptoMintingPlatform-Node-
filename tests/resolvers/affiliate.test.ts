import { Request } from 'express';
import { Types } from 'mongoose';
import { AffiliateAction, AffiliateLink, User } from 'src/models';

const bitlyLink = 'https://bittly.com/short';

const bitly = {
  shortenLongUrl: (l: string, g: string) => Promise.resolve(bitlyLink),
};

const userId = '60fd24fce7d789ae04cee939';

const userApi = {
  userId: userId,
  findFromDb: async () => {
    const user = await User.findById(userId).exec();
    return user;
  },
};

jest.mock('src/data-sources', () => ({
  Bitly: jest.fn().mockImplementation(() => bitly),
  UserApi: userApi,
}));

import { Bitly, UserApi } from 'src/data-sources';

const config = { };

const resolverBase = jest.fn().mockImplementation(() => ({
  requireAuth: (user: UserApi) => false,
}));

import { logger } from 'tests/mocks/common/logger';

jest.mock('src/common', () => ({
  config: config,
  logger: logger,
  ResolverBase: resolverBase,
}));

import { DataSources, Context } from 'src/types';
import affiliateResolver from 'src/resolvers/affiliate';
import { dbHandler } from 'tests/db';

describe('Affiliate Resolver', () => {
  const brand = 'blue';
  const token = 'token';
  const affiliateId = '6114c774f28b6b4544c3de47';
  const sessionId = 'session';
  const pageUrl = 'https://www.tests.com';
  const name = 'name';
  const context = createContext();

  const affiliateLink = {
    _id: Types.ObjectId(affiliateId),
    pageUrl: pageUrl,
    name: name,
    brand: brand,
    userId: userId,
    bitlyLink: bitlyLink,
    affiliateId: affiliateId
  };

  const blueUser = {
    _id: Types.ObjectId(userId),
    userId: userId,
    email: 'blueuser@test.com',
    password: 'Bluetest0!',
    firstName: 'Blue',
    lastName: 'User',
    displayName: 'Blue',
    profilePhotoFilename: '',
    phone: '32233224',
    phoneCountry: 'US',
    language: 'en',
    referralContext: {},
    communicationConsent: true,
    activationTermsAndConditions: [
      {
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        text: '',
      },
    ],
    gender: 'Male',
    dateOfBirth: new Date(1980, 0, 1),
    country: 'United States',
    countryCode: 'US',
    countryPhoneCode: '380',
    clinic: 'shassan',
    street: 'Echols Ave',
    city: 'Clovis',
    state: 'New Mexico',
    zipCode: '88101',
  };

  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  it('should log an affiliate visit', async () => {
    const args = {
      affiliateId: affiliateId,
      sessionId: sessionId,
      url: 'https://www.tests.com',
    };

    const response = await affiliateResolver.Query.logAffiliateVisit(
      null,
      args,
      context
    );

    expect(response).not.toBeNull();
    expect(response.data).toBeTruthy();
  });

  it('should read an affiliate link', async () => {
    dbHandler.collection('affiliate-links').insertOne(affiliateLink);

    const args = {
      affiliateId: affiliateId,
    };

    const response = await affiliateResolver.Query.affiliateLink(
      null,
      args,
      context
    );

    expect(response).not.toBeNull();
    expect(response.pageUrl).toBe(affiliateLink.pageUrl);
    expect(response.name).toBe(affiliateLink.name);
    expect(response.brand).toBe(affiliateLink.brand);
    expect(response.userId).toBe(affiliateLink.userId);
    expect(response.bitlyLink).toBe(affiliateLink.bitlyLink);
    expect(response.affiliateId).toBe(affiliateLink.affiliateId);
  });

  it('should assign a referrer', async () => {
    dbHandler.collection('users').insertOne(blueUser);
    dbHandler.collection('affiliate-links').insertOne(affiliateLink);

    const args = {
      affiliateId: affiliateId,
      sessionId: sessionId,
    };

    const response = await affiliateResolver.Mutation.assignReferredBy(
      null,
      args,
      context
    );

    expect(response).not.toBeNull();
    expect(response.data).toBeTruthy();
  });

  it('should create an affiliate link', async () => {
    const args = {
      pageUrl: pageUrl,
      name: name,
      brand: brand,
    };

    const response = await affiliateResolver.Mutation.createAffiliateLink(
      null,
      args,
      context
    );

    expect(response).not.toBeNull();
    expect(response.pageUrl).toBe(pageUrl);
    expect(response.name).toBe(name);
    expect(response.brand).toBe(brand);
  });

  function createRequest(): Request {
    function header(s: 'set-cookie'): string[];
    function header(s: string): string;
    function header(s: 'set-cookie' | string): string[] | string {
      return token;
    }

    const request: Partial<Request> = {
      header: header,
    };

    return request as Request;
  }

  function createDataSources(): DataSources {
    const dataSources: Partial<DataSources> = {
      bitly: (bitly as Partial<Bitly>) as Bitly,
      linkShortener: (bitly as Partial<Bitly>) as Bitly,
    };

    return dataSources as DataSources;
  }

  function createContext(): Context {
    const context: Partial<Context> = {
      req: createRequest(),
      dataSources: createDataSources(),
      user: (userApi as Partial<UserApi>) as UserApi,
    };

    return context as Context;
  }
});
