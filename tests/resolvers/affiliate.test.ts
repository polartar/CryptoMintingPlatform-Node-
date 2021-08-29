import { Request } from 'express';
import { Types } from 'mongoose';
import { AffiliateAction, AffiliateLink } from 'src/models';
import { blueUser } from 'tests/mocks/models';
import { createBitly, createUser } from 'tests/creators/data-sources';
import { createContext, createDataSources } from 'tests/creators/types';
import { createRequest } from 'tests/creators/express';
import { logger } from 'tests/mocks/common/logger';

const bitlyLink = 'https://bittly.com/short';

const bitly = createBitly(bitlyLink);
const userApi = createUser(blueUser.userId);

jest.mock('src/data-sources', () => ({
  Bitly: jest.fn().mockImplementation(() => bitly),
  UserApi: userApi,
}));

import { Bitly, UserApi } from 'src/data-sources';

const config = { };

const resolverBase = jest.fn().mockImplementation(() => ({
  requireAuth: (user: UserApi) => false,
}));

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
  const context = createContext(createRequest(token), createDataSources(bitly), userApi);

  const affiliateLink = {
    _id: Types.ObjectId(affiliateId),
    pageUrl: pageUrl,
    name: name,
    brand: brand,
    userId: blueUser.userId,
    bitlyLink: bitlyLink,
    affiliateId: affiliateId
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
});
