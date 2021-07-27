import * as Proxyquire from 'proxyquire';
import axios from 'axios';
import { Request } from 'express';
import { Types } from 'mongoose';
import MockAdapter from 'axios-mock-adapter';
import { mock, instance, when, anything } from 'ts-mockito';
import { IUser } from '../models';
import { Bitly } from '../data-sources/';
import { DataSources, Context } from '../types';
import { logger } from '../common';
import { dbHandler } from '../db';

describe('User Resolver', () => {
  const axiosMock = new MockAdapter(axios);
  const proxyquire = Proxyquire.noCallThru();
  const ip = '127.0.0.1';
  const token = 'token';
  const blueBrand = 'blue';
  const connectBrand = 'connect';
  const userId = '60fd24fce7d789ae04cee939';

  const firebaseUser = {
    email: 'user@test.com',
    uid: 'uid'
  };

  const emailService = {
    sendWelcomeEmail: async (sendTo: { email: string }) => true
  };

  const careclix = {
    signUp: async (user: IUser, password: string) => true
  };

  const s3Service = {
    getUrlFromFilename: (filename: string) => `https://bucket.s3.amazonaws.com/${filename}`
  };

  const userClaims = {
    permissions: [ 'VIEW_API', 'EDIT_OWN_ACCOUNT', 'VIEW_ONEVIEW', 'VIEW_PROTIPS', 'VIEW_ROBOT' ],
    role: 'member',
    userId: userId,
    authorized: true,
    twoFaEnabled: false,
    prop: ''
  }

  const blueUser = {
    _id: Types.ObjectId(userId),
    userId: userId,
    email: 'blueuser@test.com',
    password: 'Bluetest0!',
    firstName: 'Blue',
    lastName: 'User',
    displayName: 'Blue',
    phone: '32233224',
    language: 'en',
    activationTermsAndConditions: [
      {
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        text: ''
      }
    ],
    gender: 'Male',
    dateOfBirth: '1980-01-01',
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
    phone: '32233224',
    language: 'en',
    activationTermsAndConditions: [
      {
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        text: ''
      }
    ],
  };

  interface IConfig {
    supportsDisplayNames: boolean;
    brand: string;
  }

  interface IArgsUser {
    email: string;
    password?: string;
    displayName?: string
  }

  interface IUserInfo {
    email?: string;
    password?: string;
    emailVerified?: boolean;
  }

  interface IOptions {
    ignoreExpiration?: boolean
  }

  const auth = {
    createFirebaseUser: (user: IArgsUser, domain: string) => firebaseUser,
    getFirebaseUid: (firebaseToken: string, domain: string) => 'testid',
    getUser: async (uid: string, domain: string) => firebaseUser,
    signIn: async (firebaseToken: string, domain: string) => token,
    signInAfterRegister: async (firebaseUid: string, domain: string) => token,
    updateDisplayName: async (firebaseUid: string, domain: string, displayNameNew: string) => {},
    updateUserAuth: async (firebaseUid: string, userInfo: IUserInfo, domain: string) => true,
    verifyAndDecodeToken: (token: string, domain: string, options?: IOptions) => {
      return { claims: userClaims, userId: userId, }
    }
  };

  beforeAll(async () => {
    await dbHandler.connect();
    axiosMock.onGet().reply(200, { status: 'ok', payload: { id: 'id' } });
  });

  beforeEach(async () => {
    dbHandler.collection('templates').insertOne({
      _id: new Types.ObjectId().toHexString(),
      id: 'terms-of-service',
      name:'terms-of-service'
    });

    dbHandler.collection('templates').insertOne({
      _id: new Types.ObjectId().toHexString(),
      id: 'privacy-policy',
      name:'privacy-policy'
    });
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  it('should create a blue user', async () => {
    const config = {
      supportsDisplayNames: true,
      brand: blueBrand
    };

    const args = {
      userInfo: blueUser,
      ipAddress: ip
    };

    const context = createContext(config);
    const mutations = createMutations(config);
    const response = await mutations.createUser(null, args, context);

    expect(response).not.toBeNull();
    expect(response.token).toBe(token);
  });

  it('should update a blue user', async () => {
    dbHandler.collection('users').insertOne(blueUser);

    const config = {
      supportsDisplayNames: true,
      brand: blueBrand
    };

    const args = {
      userInfo: blueUser,
      ipAddress: ip
    };

    const context = createContext(config, true);
    const mutations = createMutations(config);
    const response = await mutations.updateUser(null, args, context);

    expect(response).not.toBeNull();
    expect(response.success).toBeTruthy();
    expect(response.user).not.toBeNull();
  });

  it('should create a connect user', async () => {
    const config = {
      supportsDisplayNames: true,
      brand: connectBrand
    };

    const args = {
      userInfo: connectUser,
      ipAddress: ip
    };

    const context = createContext(config);
    const mutations = createMutations(config);
    const response = await mutations.createUser(null, args, context);

    expect(response).not.toBeNull();
    expect(response.token).toBe(token);
  });

  it('should update a connect user', async () => {
    dbHandler.collection('users').insertOne(connectUser);

    const config = {
      supportsDisplayNames: true,
      brand: connectBrand
    };

    const args = {
      userInfo: connectUser,
      ipAddress: ip
    };

    const context = createContext(config, true);
    const mutations = createMutations(config);
    const response = await mutations.updateUser(null, args, context);

    expect(response).not.toBeNull();
    expect(response.success).toBeTruthy();
    expect(response.user).not.toBeNull();
  });

  function createMutations(config: IConfig) {
    const resolverBase = proxyquire('../../src/common/Resolver-Base', {
      '../common': { config: config },
      '../utils': { crypto: {} },
    });

    const userApi = {
      fromCustomToken: (token: string) => ({})
    };

    const user = proxyquire('../../src/resolvers/user', {
      '../common': { auth: auth, logger: logger, config: config, ResolverBase: resolverBase.default },
      '../data-sources/': { UserApi: userApi },
      '../data-sources/send-email': { emailService: emailService },
      '../services/careclix': { careclix: careclix },
      '../services': { s3Service: s3Service },
    });

    return user.default.Mutation;
  }

  function createRequest() {
    const mockedRequest = mock<Request>();
    when(mockedRequest.header('Authorization')).thenReturn('token');

    return instance(mockedRequest);
  }

  function createBitly() {
    const mockedBitly = mock<Bitly>();
    when(mockedBitly.getLink(anything())).thenResolve('https://bittly.com/shorttest');

    return instance(mockedBitly);
  }

  function createDataSources() {
    const bitly = createBitly();

    const mockedDataSources = mock<DataSources>();
    when(mockedDataSources.bitly).thenReturn(bitly);
    when(mockedDataSources.linkShortener).thenReturn(bitly);

    return instance(mockedDataSources);
  }

  function createContext(config: IConfig, update: boolean = false) {
    const api = proxyquire('../../src/data-sources/user', {
      '../common': { auth: auth, logger: logger, config: config },
    });

    const UserApi = api.default;

    const mockedContext = mock<Context>();
    when(mockedContext.req).thenReturn(createRequest());
    when(mockedContext.dataSources).thenReturn(createDataSources());

    if (update) {
      when(mockedContext.user).thenReturn(new UserApi(userClaims, userId, token));
    }

    return instance(mockedContext);
  }
});
