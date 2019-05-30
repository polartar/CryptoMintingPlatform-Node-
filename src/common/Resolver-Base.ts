import { ContextUser } from '../types/context';
import { AuthenticationError, ApolloError } from 'apollo-server-express';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected requireAuth(user: ContextUser) {
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
  }

  protected validateAccount(account: any) {
    if (!account) {
      throw new ApolloError('Account not found');
    }
  }
}
