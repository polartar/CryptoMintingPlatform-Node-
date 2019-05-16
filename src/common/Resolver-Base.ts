import { ContextUser } from '../types/context';
import { AuthenticationError } from 'apollo-server-express';

export default abstract class ResolverBase {
  protected requireAuth(user: ContextUser) {
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
  }
}
