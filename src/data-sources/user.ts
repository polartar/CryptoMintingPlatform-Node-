import { DataSource } from 'apollo-datasource';
import { config } from '../common';
import { Model } from 'mongoose';
import { userSchema } from '../models';
import { IUser } from '../types';
import { IUserClaims } from '../types/context';

interface IWalletAccountDefaults {
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
  cryptoFavorites?: string[];
}
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
}
