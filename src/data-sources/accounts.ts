import Db from './db';
import { Account } from '../models';

class Accounts extends Db {
  model = Account;

  public async createAccount(userId: string, accountName: string) {
    const account = await this.create({ userId, accountName });
    return account;
  }

  public async editAccountName(accountId: string, newAccountName: string) {
    const result = await this.updateById(accountId, {
      accountName: newAccountName,
    });
    return result;
  }

  public async deleteAccount(accountId: string) {
    const result = await this.deleteById(accountId);
    return result;
  }

  public async findByUserId(userId: string) {
    const accounts = await this.find({ userId });
    return accounts;
  }
}

export default Accounts;
