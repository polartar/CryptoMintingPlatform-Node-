import { DataSource } from 'apollo-datasource';
import { config, logger } from '../common';
import { Model } from 'mongoose';
import { User } from '../models';
import { IUser } from '../types';
import { IUserClaims } from '../types/context';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ApolloError } from 'apollo-server-express';
export default class UserApi extends DataSource {
  Model: Model<IUser> = User;
  domain: string;
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;

  constructor(userClaims: IUserClaims) {
    super();
    const { permissions, role, userId, authorized, twoFaEnabled } = userClaims;
    this.permissions = permissions;
    this.role = role;
    this.authorized = authorized;
    this.userId = userId;
    this.twoFaEnabled = twoFaEnabled;
  }

  public async findFromDb() {
    try {
      logger.debug(`data-sources.user.findFromDB(${this.userId}):start`);
      const user = await User.findById(this.userId).exec();
      logger.debug(`data-sources.user.findFromDB(${this.userId}):done`);
      return user;
    } catch (error) {
      logger.warn(
        `data-sources.user.findFromDB.catch(${this.userId}):${error}`,
      );
      throw error;
    }
  }

  public async setWalletAccountToUser(
    ethAddress?: string,
    ethBlockNumAtCreation?: number,
  ) {
    try {
      logger.debug(
        `data-sources.user.setWalletAccountToUser.ethAddress(${
          this.userId
        }):${ethAddress}`,
      );
      logger.debug(
        `data-sources.user.setWalletAccountToUser.ethBlockNumAtCreation(${
          this.userId
        }):${ethBlockNumAtCreation}`,
      );

      const user = await this.Model.findById(this.userId);
      logger.debug(
        `data-sources.user.setWalletAccountToUser.user.id(${this.userId}):${
          user.id
        }`,
      );
      const defaults: any = {
        cryptoFavorites:
          user && user.wallet && user.wallet.cryptoFavoritesSet
            ? user.wallet.cryptoFavorites
            : config.defaultCryptoFavorites,
        cryptoFavoritesSet: true,
      };
      const walletToSet = { ...defaults, ethAddress, ethBlockNumAtCreation };
      const result = await this.Model.findByIdAndUpdate(
        this.userId,
        { wallet: walletToSet },
        { new: true },
      );
      logger.debug(
        `data-sources.user.setWalletAccountToUser.user.findByIdAndUpdate(${
          this.userId
        }):done`,
      );
      return result;
    } catch (error) {
      logger.warn(
        `data-sources.user.setWalletAccountToUser.catch(${
          this.userId
        }):${error}`,
      );
      throw error;
    }
  }

  public async setBtcAddressToUser(btcAddress: string) {
    logger.debug(
      `data-sources.user.setBtcAddressToUser.btcAddress(${
        this.userId
      }):${btcAddress}`,
    );
    const result = await this.Model.findByIdAndUpdate(
      this.userId,
      { 'wallet.btcAddress': btcAddress },
      { new: true },
    );
    logger.debug(
      `data-sources.user.setBtcAddressToUser.user.findByIdAndUpdate(${
        this.userId
      }):done`,
    );
    return result;
  }

  async setTempTwoFaSecret() {
    logger.debug(`data-sources.user.setTempTwoFaSecret(${this.userId})`);

    try {
      const user = await this.findFromDb();
      logger.debug(
        `data-sources.user.setTempTwoFaSecret.user.id(${this.userId}):${
          user.id
        }`,
      );
      if (!user) {
        throw new Error('User not found');
      }

      const secret = speakeasy.generateSecret({
        length: 20,
      });
      logger.debug(
        `data-sources.user.setTempTwoFaSecret.!!secret(${
          this.userId
        }):${!!secret}`,
      );

      const otpUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.email,
        issuer: config.hostname,
        encoding: 'base32',
      });
      logger.debug(
        `data-sources.user.setTempTwoFaSecret.!!otpUrl(${
          this.userId
        }):${!!otpUrl}`,
      );

      user.twoFaTempSecret = secret.base32;
      await user.save();
      logger.debug(
        `data-sources.user.setTempTwoFaSecret.tempSecret.save()(${
          this.userId
        }):done`,
      );

      const qrCode = await QRCode.toDataURL(otpUrl);
      logger.debug(
        `data-sources.user.setTempTwoFaSecret.!!qrCode(${
          this.userId
        }):${!!qrCode}`,
      );

      return { qrCode, secret: secret.base32 };
    } catch (error) {
      logger.warn(
        `data-sources.user.setTempTwoFaSecret.catch(${this.userId}):${error}`,
      );
      throw error;
    }
  }

  async validateTwoFa(totpToken: string) {
    logger.debug(
      `data-sources.user.validateTwoFa.!!totpToken(${
        this.userId
      }):${!!totpToken}`,
    );
    try {
      const user = await this.findFromDb();
      logger.debug(
        `data-sources.user.validateTwoFa.user.id(${this.userId}):${user.id}`,
      );
      if (!user) {
        throw new Error('User not found');
      }
      const { twoFaSecret, twoFaTempSecret } = user;
      logger.debug(
        `data-sources.user.validateTwoFa.!!twoFaSecret(${
          this.userId
        }):${!!twoFaSecret}`,
      );
      logger.debug(
        `data-sources.user.validateTwoFa.!!twoFaTempSecret(${
          this.userId
        }):${!!twoFaTempSecret}`,
      );
      if (!twoFaTempSecret && !twoFaSecret)
        throw new ApolloError('User not registered for 2FA');

      const verified = speakeasy.totp.verify({
        secret: twoFaSecret || twoFaTempSecret,
        encoding: 'base32',
        token: totpToken,
      });
      logger.debug(
        `data-sources.user.validateTwoFa.verified(${this.userId}):${verified}`,
      );

      if (!verified) {
        return false;
      }

      if (!twoFaSecret) {
        user.twoFaSecret = twoFaTempSecret;
        await user.save();
        logger.debug(
          `data-sources.user.validateTwoFa.twoFaSecret.save()(${
            this.userId
          }):done`,
        );
      }
      return true;
    } catch (error) {
      logger.warn(
        `data-sources.user.validateTwoFa.catch(${this.userId}):${error}`,
      );
      throw error;
    }
  }

  incrementTxCount() {
    try {
      logger.debug(`data-sources.user.incrementTxCount(${this.userId})`);
      return this.Model.findByIdAndUpdate(this.userId, {
        $inc: { 'wallet.ethNonce': 1 },
      }).exec();
    } catch (error) {
      logger.warn(
        `data-sources.user.incrementTxCount.catch(${this.userId}):error`,
      );
      throw error;
    }
  }
}
