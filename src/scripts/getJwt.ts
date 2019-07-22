require('dotenv').config();
import { ClientAuth } from '@blockbrothers/firebasebb';
import * as fs from 'fs'
import authResolver from '../resolvers/auth';

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  LOGIN_EMAIL: email,
  LOGIN_PASSWORD: password
} = process.env;

export const auth = new ClientAuth({
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID
})

void (async () => {
  console.log('Starting');
  const firebaseToken = await auth.signIn(email, password)
  const { token } = await authResolver.Mutation.login(null, { token: firebaseToken });
  console.log(token);
  console.log('Done');
})()
