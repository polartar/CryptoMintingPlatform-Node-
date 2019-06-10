// Basic full crud interface for adding, editing, and deleting accounts for a specific user.

import Db from './db';
import { WalletAccount } from '../models';
import { Model } from 'mongoose';
import { IWalletAccount } from '../models/walletAccount';

class Accounts extends Db {
  model: Model<IWalletAccount> = WalletAccount;

  public async createAccount(userId: string) {
    const account = await this.create({ userId });
    return account;
  }

  public async findByUserId(userId: string) {
    const account = await this.findOne({ userId });
    return account;
  }
}

export default Accounts;
