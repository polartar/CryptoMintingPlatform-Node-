import { Request } from 'express';
import { Types } from 'mongoose';
import { ServerAuth } from '@blockbrothers/firebasebb';
import { IUser, User } from 'src/models';

const crypto = {};

const careclix = {
  signUp: async (user: IUser, password: string) => true,
};

const s3 = {
  getUrlFromFilename: (filename: string) =>
    `https://bucket.s3.amazonaws.com/${filename}`,
};

const bitly = {
  getLink: () => Promise.resolve('https://bittly.com/shorttest'),
};

const userId = '60fd24fce7d789ae04cee939';

const userApi = {
  findFromDb: async () => {
    const user = await User.findById(userId).exec();
    return user;
  },
};

jest.mock('src/data-sources', () => ({
  bitly: bitly,
  UserApi: userApi,
}));

import { Bitly, UserApi } from 'src/data-sources';

UserApi.fromCustomToken = (token: string) => userApi as UserApi;

const token = 'token';

const firebaseUser = {
  email: 'user@test.com',
  uid: 'uid',
};

const userClaims = {
  permissions: [
    'VIEW_API',
    'EDIT_OWN_ACCOUNT',
    'VIEW_ONEVIEW',
    'VIEW_PROTIPS',
    'VIEW_ROBOT',
  ],
  role: 'member',
  userId: userId,
  authorized: true,
  twoFaEnabled: false,
  prop: '',
};

interface IArgsUser {
  email: string;
  password?: string;
  displayName?: string;
}

interface IUserInfo {
  email?: string;
  password?: string;
  emailVerified?: boolean;
}

interface IOptions {
  ignoreExpiration?: boolean;
}

const auth = {
  createFirebaseUser: (user: IArgsUser, domain: string) => firebaseUser,
  getFirebaseUid: (firebaseToken: string, domain: string) => 'testid',
  getUser: async (uid: string, domain: string) => firebaseUser,
  signIn: async (firebaseToken: string, domain: string) => token,
  signInAfterRegister: async (firebaseUid: string, domain: string) => token,
  updateDisplayName: async (
    firebaseUid: string,
    domain: string,
    displayNameNew: string,
  ) => {},
  updateUserAuth: async (
    firebaseUid: string,
    userInfo: IUserInfo,
    domain: string,
  ) => true,
  verifyAndDecodeToken: (token: string, domain: string, options?: IOptions) => {
    return { claims: userClaims, userId: userId };
  },
};

const config = {
  brand: 'blue',
  nodeEnv: 'development',
  rewardDistributerPkey: '0x1f',
  sendGridApiKey: 'SG.test',
  supportsDisplayNames: true,
};

const resolverBase = jest.fn().mockImplementation(() => ({
  requireAuth: (user: UserApi) => false,
}));

jest.mock('src/utils/crypto', () => crypto);

jest.mock('src/services', () => ({
  careclix: careclix,
  s3: s3,
}));

import { logger } from 'tests/mocks/common/logger';

jest.mock('src/common', () => ({
  auth: auth,
  config: config,
  logger: logger,
  ResolverBase: resolverBase,
}));

import { DataSources, Context } from 'src/types';
import userResolver from 'src/resolvers/user';
import { dbHandler } from 'tests/db';

describe('User Resolver', () => {
  const ip = '127.0.0.1';
  const blueBrand = 'blue';
  const connectBrand = 'connect';

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

  const connectUser = {
    _id: Types.ObjectId(userId),
    userId: userId,
    email: 'connectuser@test.com',
    password: 'Connecttest0!',
    firstName: 'Connect',
    lastName: 'User',
    displayName: 'Connect',
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
  };

  const request = createRequest();
  const dataSources = createDataSources();

  beforeAll(async () => {
    await dbHandler.connect();
  });

  beforeEach(async () => {
    dbHandler.collection('templates').insertOne({
      _id: new Types.ObjectId().toHexString(),
      id: 'terms-of-service',
      name: 'terms-of-service',
    });

    dbHandler.collection('templates').insertOne({
      _id: new Types.ObjectId().toHexString(),
      id: 'privacy-policy',
      name: 'privacy-policy',
    });
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  it('should create a blue user', async () => {
    config.brand = blueBrand;

    const args = {
      userInfo: blueUser,
      ipAddress: ip,
    };

    const context = createContext();
    const response = await userResolver.Mutation.createUser(
      null,
      args,
      context,
    );

    expect(response).not.toBeNull();
    expect(response.token).toBe(token);
  });

  it('should update a blue user', async () => {
    dbHandler.collection('users').insertOne(blueUser);

    config.brand = blueBrand;

    const args = {
      userInfo: blueUser,
      ipAddress: ip,
    };

    const context = createContext(true);
    const response = await userResolver.Mutation.updateUser(
      null,
      args,
      context,
    );

    expect(response).not.toBeNull();
    expect(response.success).toBeTruthy();
    expect(response.user).not.toBeNull();
  });

  it('should create a connect user', async () => {
    config.brand = connectBrand;

    const args = {
      userInfo: connectUser,
      ipAddress: ip,
    };

    const context = createContext();
    const response = await userResolver.Mutation.createUser(
      null,
      args,
      context,
    );

    expect(response).not.toBeNull();
    expect(response.token).toBe(token);
  });

  it('should update a connect user', async () => {
    dbHandler.collection('users').insertOne(connectUser);

    config.brand = connectBrand;

    const args = {
      userInfo: connectUser,
      ipAddress: ip,
    };

    const context = createContext(true);
    const response = await userResolver.Mutation.updateUser(
      null,
      args,
      context,
    );

    expect(response).not.toBeNull();
    expect(response.success).toBeTruthy();
    expect(response.user).not.toBeNull();
  });

  function createContext(update: boolean = false): Context {
    const context: Partial<Context> = {
      req: request,
      dataSources: dataSources,
      user: update ? ((userApi as Partial<UserApi>) as UserApi) : undefined,
    };

    return context as Context;
  }

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
});
