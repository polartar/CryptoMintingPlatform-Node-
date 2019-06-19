import { DataSource } from 'apollo-datasource';
import { config } from '../common';
import { Model } from 'mongoose';
import { userSchema } from '../models';
import { IUser } from '../types';
import { IUserClaims } from '../types/context';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ApolloError } from 'apollo-server-express';

export default class User extends DataSource {
  Model: Model<IUser>;
  domain: string;
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;

  constructor(domain: string, userClaims: IUserClaims) {
    super();
    const { permissions, role, userId, authorized, twoFaEnabled } = userClaims;
    const connection = config.authDbConnectionMap.get(domain);
    this.Model = connection.model('user', userSchema);
    this.domain = domain;
    this.permissions = permissions;
    this.role = role;
    this.authorized = authorized;
    this.userId = userId;
    this.twoFaEnabled = twoFaEnabled;
  }

  public async findFromDb() {
    const user = await this.Model.findById(this.userId).exec();
    return user;
  }

  public async setWalletAccountToUser(
    ethAddress?: string,
    ethBlockNumAtCreation?: number,
  ) {
    const user = await this.Model.findById(this.userId);
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
  }

  async setTempTwoFaSecret() {
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
        issuer: this.domain,
        encoding: 'base32',
      });

      user.twoFaTempSecret = secret.base32;
      await user.save();

      const dataUrl = await QRCode.toDataURL(otpUrl);

      return dataUrl;
    } catch (error) {
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
      throw error;
    }
  }
}
