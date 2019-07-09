import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { UserApi } from '../data-sources';
import config from './config';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected requireAuth(user: UserApi) {
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
  }

  protected requireTwoFa(twoFaValid: boolean) {
    const { isDev, bypassTwoFaInDev } = config;
    if (isDev && bypassTwoFaInDev) return;
    if (!twoFaValid) throw new ForbiddenError('Invalid two factor auth token');
  }
}
