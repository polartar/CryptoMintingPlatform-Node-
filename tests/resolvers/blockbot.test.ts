import { AuthenticationError } from 'apollo-server-express';
import { connection } from 'mongoose';
import { Request } from 'express';
import { DataSources, Context } from 'src/types';

//#region mocks
import { createUser } from 'tests/creators/data-sources';
import { createContext } from 'tests/creators/types';
import { logger } from 'tests/mocks/common/logger';
import { dbHandler } from 'tests/db';
import { blockBotReport } from 'tests/mocks/models';

const userApi = createUser(blockBotReport.UserId);
jest.mock('src/data-sources', () => ({
  UserApi: userApi,
}));

import { UserApi } from 'src/data-sources';
/**
 * Need to mock src/common/Resolver-Base because
 * the block-bot resolver import it directly
 * instead of use import {ResolverBase} from src/common
 */
const resolverBase = jest.fn().mockImplementation(() => ({
  requireAuth: (user: UserApi) => {
    if (!user) throw new AuthenticationError('Authentication required');
  },
}));

jest.mock('src/common/Resolver-Base', () => ({
  default: resolverBase,
}));

jest.mock('src/common', () => ({
  config: {},
  logger: logger,
}));
//#endregion mocks

import blockbotResolver from 'src/resolvers/blockbot';

describe('Check the the getBlockbotReport query', () => {
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  const mockedContext = createContext(
    ({} as Partial<Request>) as Request,
    ({} as Partial<DataSources>) as DataSources,
    createUser(blockBotReport.UserId),
  );

  it('Should return the last BlockbotReport for a user with reports', async () => {
    await connection
      .collection('win-report-blockbots')
      .insertOne(blockBotReport);
    const result = await blockbotResolver.Query.getBlockbotReport(
      null,
      null,
      mockedContext,
    );
    expect(result).not.toBeNull();
    expect(JSON.stringify(result)).toBe(JSON.stringify(blockBotReport));
  });

  it('Should return nothing for a user without BlockbotReport', async () => {
    mockedContext.user.userId = '100000000000000000000000';
    const result = await blockbotResolver.Query.getBlockbotReport(
      null,
      null,
      mockedContext,
    );
    expect(result).toBeNull();
  });

  it('should deny authorization if a user is not present', async () => {
    //Doing this the user is omited in the context var.
    let mockedContext: Partial<Context> = {};
    await expect(
      blockbotResolver.Query.getBlockbotReport(
        null,
        null,
        mockedContext as Context,
      ),
    ).rejects.toEqual(new AuthenticationError('Authentication required'));
  });
});
