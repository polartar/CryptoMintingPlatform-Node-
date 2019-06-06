// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../types';
import { IAccount } from '../models/account';

export default abstract class WalletBase {
  constructor(
    protected name: string,
    public symbol: string,
    protected contractAddress: string,
    protected abi: any,
    protected backgroundColor: string,
    protected icon: string,
  ) {}

  abstract getBalance(
    userAccount: IAccount,
  ): Promise<{
    accountId: string;
    symbol: string;
    name: string;
    balance: { confirmed: string; unconfirmed: string };
    receiveAddress: string;
  }>;

  abstract getTransactions(userAccount: IAccount): Promise<ITransaction[]>;

  abstract estimateFee(): Promise<number>;

  abstract send(
    userAccount: IAccount,
    to: string,
    amount: string,
  ): Promise<{ success: boolean; message?: string }>;
}
