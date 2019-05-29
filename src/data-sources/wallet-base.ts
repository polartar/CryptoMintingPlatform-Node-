// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../types';

export default abstract class WalletBase {
  constructor(
    protected name: string,
    protected symbol: string,
    protected contract: string,
  ) {}

  abstract getBalance(
    accountId: string,
  ): Promise<{
    accountId: string;
    symbol: string;
    name: string;
    balance: { confirmed: number; unconfirmed: number };
    receiveAddress: string;
  }>;

  abstract getTransactions(accountId: string): Promise<ITransaction[]>;

  abstract send(
    accountId: string,
    to: string,
    amount: number,
  ): Promise<{ success: boolean; message?: string }>;
}
