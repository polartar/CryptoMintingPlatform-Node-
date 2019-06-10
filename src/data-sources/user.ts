import { DataSource } from 'apollo-datasource';
import { config } from '../common';
import { Model } from 'mongoose';
import { userSchema } from '../models';
import { IUser } from '../types';

export default class User extends DataSource {
  userModels: Map<string, Model<IUser>> = new Map();
  constructor() {
    super();
    this.buildModels();
  }

  private buildModels() {
    for (const host in config.authDbConnections) {
      const conn = config.authDbConnections[host];
      this.userModels.set(host, conn.db.model('user', userSchema));
    }
  }

  getUserModel(domain: string) {
    return this.userModels.get(domain);
  }
}
