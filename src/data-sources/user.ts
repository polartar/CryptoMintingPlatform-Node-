import { DataSource } from 'apollo-datasource';
import { config } from '../common';
import { Model } from 'mongoose';
import { userSchema } from '../models';
import { IUser } from '../types';
import { ContextUser } from '../types/context';

export default class User extends DataSource {
  userModels: Map<string, Model<IUser>> = new Map();
  host: string;
  userId: string;
  constructor() {
    super();
    this.buildModels();
  }

  private buildModels() {
    for (const connection of config.authDbConnections) {
      const { db: conn, domain } = connection;
      this.userModels.set(domain, conn.model('user', userSchema));
    }
  }

  public getUserModel(domain?: string) {
    const selectedDomain = domain || this.host;
    if (!selectedDomain) {
      throw new Error('Domain required');
    }
    return this.userModels.get(domain);
  }

  public async getWalletAccount(userId?: string, domain?: string) {
    const selectedDomain = domain || this.host;
    if (!selectedDomain) {
      throw new Error('Domain required');
    }
    const selectedUserId = userId || this.userId;
    if (!selectedUserId) {
      throw new Error('userId required');
    }
    const userModel = this.getUserModel(selectedDomain);
    const wallet = await userModel
      .findById(selectedUserId)
      .select({ wallet: 1, id: 1 })
      .exec();
    return wallet;
  }

  public async setWalletAccountToUser(
    ethAddress: string,
    ethBlockNumAtCreation: number,
    userId?: string,
  ) {
    const selectedUserId = userId || this.userId;
    if (!selectedUserId) throw new Error('userId required');
    if (!this.host) throw new Error('domain not set');

    const UserModel = this.getUserModel(this.host);
    const result = await UserModel.findByIdAndUpdate(
      selectedUserId,
      { wallet: { ethAddress, ethBlockNumAtCreation } },
      { new: true },
    );
    return result;
  }

  public domain(domain: string) {
    this.host = domain;
    return this;
  }

  public user(user: ContextUser) {
    this.userId = user.userId;
    return this;
  }
}
