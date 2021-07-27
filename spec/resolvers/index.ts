/*import * as Proxyquire from 'proxyquire';
import { mergeResolvers } from 'merge-graphql-schemas';
import { logger } from '../../src/common';
const proxyquire = Proxyquire.noCallThru();

const config = { supportsDisplayNames: true };

const auth = {
  getFirebaseUid: (firebaseToken: string, domain: string) => 'testid',
  updateDisplayName: async (firebaseUid: string, domain: string, displayNameNew: string) => {},
  getUser: async (uid: string, domain: string) => ({ email: 'user@test.com', uid: 'uid' }),
  signIn: async (firebaseToken: string, domain: string) => 'token',
  signInAfterRegister: async (firebaseUid: string, domain: string) => 'token',
};

const emailService = {
  sendWelcomeEmail: async (sendTo: { email: string }) => true
};

const userApi = {
  fromCustomToken: (token: string) => ({})
};

const user = proxyquire('../../src/resolvers/user-test', {
  '../common': { auth: auth, logger: logger, config: config },
  '../data-sources/send-email': { emailService: emailService },
  '../data-sources/': { UserApi: userApi },
});

const resolvers = mergeResolvers([ user ]);
const mutations: any = resolvers.default.Mutation;

export default mutations;*/
