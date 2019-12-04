import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { UserApi } from '../data-sources';
import { config } from '../common';
import { crypto } from '../utils';
import logger from './logger/winston-logger';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected requireAuth(user: UserApi) {
    if (!user) {
      logger.debug(`common.Resolver-Base.!user`);
      throw new AuthenticationError('Authentication required');
    }
  }

  protected requireTwoFa(twoFaValid: boolean) {
    const { isDev, bypassTwoFaInDev } = config;
    logger.debug(`common.Resolver-Base.requireTwoFa.twoFaValid:${twoFaValid}`);
    logger.debug(`common.Resolver-Base.requireTwoFa.isDev:${isDev}`);
    logger.debug(
      `common.Resolver-Base.requireTwoFa.bypassTwoFaInDev:${bypassTwoFaInDev}`,
    );

    if (isDev && bypassTwoFaInDev) return;
    if (!twoFaValid) throw new ForbiddenError('Invalid two factor auth token');
  }

  protected maybeRequireStrongWalletPassword(walletPassword: string) {
    logger.debug(
      `common.Resolver-Base.maybeRequireStrongWalletPassword.clientSecretRequired:${
        config.clientSecretKeyRequired
      }`,
    );
    if (config.clientSecretKeyRequired) {
      logger.debug(
        `common.Resolver-Base.maybeRequireStrongWalletPassword.!!walletPassword:${!!walletPassword}`,
      );
      if (!walletPassword) {
        throw new Error('Wallet password required');
      }
      const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[.,!@#$%^&*<>?()-_=+\\{}[\];:"~`|\'])(?=.{8,})/;
      const isPasswordStrong = strongPasswordPattern.test(walletPassword);
      logger.debug(
        `common.Resolver-Base.maybeRequireStrongWalletPassword.isPasswordString:${isPasswordStrong}`,
      );
      if (!isPasswordStrong) {
        throw new Error('Weak Password');
      }
    }
  }

  protected encrypt = (plainText: string, secret: string) =>
    crypto.encrypt(plainText, secret);

  protected decrypt = (encryptedText: string, secret: string) =>
    crypto.decrypt(encryptedText, secret);

  protected hash = (value: string) => crypto.hash(value);
}
