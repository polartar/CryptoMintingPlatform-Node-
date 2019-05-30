// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../types';
import { IAccount } from '../models/account';

export default abstract class WalletBase {
  constructor(
    protected name: string,
    protected symbol: string,
    protected contract: string,
  ) {}

  abstract getBalance(
    userAccount: IAccount,
  ): Promise<{
    accountId: string;
    symbol: string;
    name: string;
    balance: { confirmed: number; unconfirmed: number };
    receiveAddress: string;
  }>;

  abstract getTransactions(userAccount: IAccount): Promise<ITransaction[]>;

  abstract estimateFee(): Promise<number>;

  // abstract send(
  //   accountId: string,
  //   to: string,
  //   amount: number,
  // ): Promise<{ success: boolean; message?: string }>;
}
