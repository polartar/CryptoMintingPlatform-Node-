import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { UserApi } from '../data-sources';
import { config } from '../common';
import { crypto } from '../utils'

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

  protected maybeRequireStrongWalletPassword(walletPassword: string) {
    if (config.clientSecretKeyRequired) {
      if (!walletPassword) {
        throw new ForbiddenError('Wallet password required')
      }
      const strongPasswordPattern = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");
      const isPasswordStrong = strongPasswordPattern.test(walletPassword);
      if (!isPasswordStrong) {
        throw new UserInputError('Weak Password')
      }
    }
  }

  protected encrypt = (plainText: string, secret: string) => crypto.encrypt(plainText, secret)

  protected decrypt = (encryptedText: string, secret: string) => crypto.decrypt(encryptedText, secret);

  protected hash = (value: string) => crypto.hash(value)
}
