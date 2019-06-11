import { ContextUser } from '../types/context';
import { AuthenticationError } from 'apollo-server-express';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected requireAuth(user: ContextUser) {
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
  }
}
