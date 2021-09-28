import { IncomingMessage, ServerResponse } from 'http';
import { ClientAuth } from '@blockbrothers/firebasebb';
import { auth, config } from '../common';
import { IUser } from '../models';
import { IFirebaseClient } from '../types';

// TODO: move me
interface ApolloContext {
  req: IncomingMessage;
  res: ServerResponse;
}

class Iam {}

const FIREBASE_CLIENT_INFO: IFirebaseClient = config.firebaseClientInfo;
const AUTH_APP_DOMAIN: string = config.hostname;

const IamAuthenticateResponse = {
  async principal(root: any, args: any, ctx: ApolloContext) {
    if (!root) {
      return null;
    }

    const { metadata }: any = root || {};
    if (!metadata || !metadata.uid) {
      console.warn(__filename, 'Danger: need to have user id?');
      return null;
    }

    let user;
    try {
      user = await auth.getUser(metadata.uid, AUTH_APP_DOMAIN);
      if (!user) {
        throw new Error('No user profile could be found.');
      }
    } catch (err) {
      throw new Error(
        `Could not find user by uid=${metadata.uid}: ${err.message}`,
      );
    }

    return user;
  },
};

const IamOps = {
  async authenticate(
    root: any,
    args: { input: { username: string; password: string } },
    ctx: ApolloContext,
  ) {
    const { username, password } = args.input;

    const client = new ClientAuth({
      apiKey: FIREBASE_CLIENT_INFO.ApiKey,
      authDomain: FIREBASE_CLIENT_INFO.AuthDomain,
      projectId: FIREBASE_CLIENT_INFO.ProjectId,
    });

    let success = false;
    let message = null;
    const metadata: any = {};

    let authentication;
    try {
      const fbAuth = await client.signIn(username, password);
      const token = await auth.signIn(fbAuth, AUTH_APP_DOMAIN);
      if (token) {
        authentication = {
          token,
          type: 'Bearer',
        };
      }

      const uid = await auth.getFirebaseUid(fbAuth, AUTH_APP_DOMAIN);
      if (uid) {
        metadata.uid = uid;
      }
      // const user = await auth.getUser(fbAuth, AUTH_APP_DOMAIN)
      // console.log({ fbAuth, ours, uid })
      message = 'Success!';
      success = true;
    } catch (err) {
      console.warn('Failed authentication attemp', err);
      message = err.message;
    }

    return {
      authentication,
      success,
      message,
      metadata,
    };
  },
};

export default {
  Iam,
  IamOps,
  IamAuthenticateResponse,
  Query: {
    iam: () => ({}),
  },
  Mutation: {
    iam: () => ({}),
  },
};
