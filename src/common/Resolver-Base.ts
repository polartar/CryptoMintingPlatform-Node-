import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { UserApi } from 'src/data-sources';
import { config } from 'src/common';
import { crypto } from 'src/utils';
import { Context } from 'src/types/context';
import { logger } from './';

export default abstract class ResolverBase {
  // Common method to throw an graphQL auth error if the user is null
  protected validateWalletPassword = async (
    {
      password,
      walletApi,
      user,
      symbol,
    }: {
      password: string;
      symbol?: string;
      walletApi: Context['wallet'];
      user: Context['user'];
    },
    failedSymbols: string[] = [],
  ): Promise<boolean> => {
    try {
      const wallet = walletApi.coin(symbol);

      const check = await wallet.checkPassword(user, password);
      if (!check) {
        throw Error(`Incorrect password for ${symbol} wallet`);
      }
      return check;
    } catch (err) {
      try {
        failedSymbols.push(symbol);
        if (symbol !== 'ETH' && !failedSymbols.includes('ETH')) {
          return this.validateWalletPassword(
            {
              password,
              symbol: 'ETH',
              walletApi,
              user,
            },
            failedSymbols,
          );
        } else if (symbol !== 'BTC' && !failedSymbols.includes('BTC')) {
          return this.validateWalletPassword(
            {
              password,
              symbol: 'BTC',
              walletApi,
              user,
            },
            failedSymbols,
          );
        }
      } catch (error) {
        logger.warn(
          `resolvers.exchange.convert.validateWalletPassword.catch ${err}, password check for all symbols failed`,
        );
        throw error;
      }
      logger.warn(
        `resolvers.exchange.convert.validateWalletPassword.catch ${err}`,
      );
      throw err;
    }
  };

  protected requireAuth = (user: UserApi) => {
    if (!user) {
      logger.debug(`common.Resolver-Base.!user`);
      throw new AuthenticationError('Authentication required');
    }
  };

  protected requireAdmin = (user: UserApi) => {
    if (!user || user.role.toLowerCase() !== 'admin') {
      throw new ForbiddenError('Forbidden');
    }
  };

  protected requireTwoFa = (twoFaValid: boolean) => {
    const { isDev, bypassTwoFaInDev } = config;
    logger.debug(`common.Resolver-Base.requireTwoFa.twoFaValid:${twoFaValid}`);
    logger.debug(`common.Resolver-Base.requireTwoFa.isDev:${isDev}`);
    logger.debug(
      `common.Resolver-Base.requireTwoFa.bypassTwoFaInDev:${bypassTwoFaInDev}`,
    );

    if (isDev && bypassTwoFaInDev) return;
    if (!twoFaValid) throw new ForbiddenError('Invalid two factor auth token');
  };

  protected maybeRequireStrongWalletPassword = (walletPassword: string) => {
    logger.debug(
      `common.Resolver-Base.maybeRequireStrongWalletPassword.clientSecretRequired:${config.clientSecretKeyRequired}`,
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
  };

  protected encrypt = (plainText: string, secret: string) =>
    crypto.encrypt(plainText, secret);

  protected decrypt = (encryptedText: string, secret: string) =>
    crypto.decrypt(encryptedText, secret);

  protected hash = (value: string) => crypto.hash(value);

  protected requireBrand = () => {
    const { brand } = config;
    return {
      toBe: (expectedBrand: string) => {
        if (brand === 'localhost') return;
        if (expectedBrand.toLowerCase() !== brand.toLowerCase()) {
          throw new Error(`Query/Mutation not available for ${expectedBrand}`);
        }
      },
      toNotBe: (expectedBrand: string) => {
        if (brand === 'localhost') return;
        if (expectedBrand.toLowerCase() === brand.toLowerCase()) {
          throw new Error(`Query/Mutation not available for ${expectedBrand}`);
        }
      },
      toBeIn: (expectedBrands: string[]) => {
        if (brand === 'localhost') return;
        if (!expectedBrands.includes(brand)) {
          throw new Error(
            `Query/Mutation not available for ${expectedBrands.join(', ')}`,
          );
        }
      },
      toNotBeIn: (expectedBrands: string[]) => {
        if (brand === 'localhost') return;
        if (expectedBrands.includes(brand)) {
          throw new Error(
            `Query/Mutation not available for ${expectedBrands.join(', ')}`,
          );
        }
      },
    };
  };
}
