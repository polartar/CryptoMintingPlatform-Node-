import { DataSource } from 'apollo-datasource';
import { config, logger } from '../common';
import { Model } from 'mongoose';
import { User } from '../models';
import { IUser } from '../types';
import { IUserClaims } from '../types/context';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ApolloError } from 'apollo-server-express';
import auth from '../common/auth';
export default class UserApi extends DataSource {
  Model: Model<IUser> = User;
  domain: string;
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;
  token: string;
  claims: IUserClaims;
  uid: string;

  constructor(token: string) {
    super();
    const { claims, uid } = auth.verifyAndDecodeToken(token, config.hostname);
    this.claims = claims;
    this.uid = uid;
    const { permissions, role, userId, authorized, twoFaEnabled } = claims;
    this.token = token;
    this.permissions = permissions;
    this.role = role;
    this.authorized = authorized;
    this.userId = userId;
    this.twoFaEnabled = twoFaEnabled;
  }

  public async findFromDb() {
    try {
      const user = await User.findById(this.userId).exec();
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
    const result = await this.Model.findByIdAndUpdate(
      this.userId,
      { 'wallet.btcAddress': btcAddress },
      { new: true },
    );
    return result;
  }

  async setTempTwoFaSecret() {
    logger.debug(`data-sources.user.setTempTwoFaSecret(${this.userId})`);

    try {
      const user = await this.findFromDb();
      if (!user) {
        throw new Error('User not found');
      }

      const secret = speakeasy.generateSecret({
        length: 20,
      });

      const otpUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.email,
        issuer: config.hostname,
        encoding: 'base32',
      });

      user.twoFaTempSecret = secret.base32;
      await user.save();

      const qrCode = await QRCode.toDataURL(otpUrl);

      return { qrCode, secret: secret.base32 };
    } catch (error) {
      logger.warn(
        `data-sources.user.setTempTwoFaSecret.catch(${this.userId}):${error}`,
      );
      throw error;
    }
  }

  async validateTwoFa(totpToken: string) {
    try {
      const user = await this.findFromDb();

      if (!user) {
        throw new Error('User not found');
      }
      const { twoFaSecret, twoFaTempSecret } = user;

      if (!twoFaTempSecret && !twoFaSecret)
        throw new ApolloError('User not registered for 2FA');

      const verified = speakeasy.totp.verify({
        secret: twoFaSecret || twoFaTempSecret,
        encoding: 'base32',
        token: totpToken,
      });

      if (!verified) {
        return false;
      }

      if (!twoFaSecret) {
        user.twoFaSecret = twoFaTempSecret;
        await user.save();
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
