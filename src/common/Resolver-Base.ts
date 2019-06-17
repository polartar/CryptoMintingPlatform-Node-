import { AuthenticationError } from 'apollo-server-express';
import { UserApi } from '../data-sources';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected requireAuth(user: UserApi) {
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
  }
}
