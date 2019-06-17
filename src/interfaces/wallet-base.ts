// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
import { ITransaction } from '../types';
import { UserApi } from '../data-sources';

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
    userApi: UserApi,
  ): Promise<{
    accountId: string;
    symbol: string;
    name: string;
    balance: { confirmed: string; unconfirmed: string };
    receiveAddress: string;
  }>;

  abstract getTransactions(userApi: UserApi): Promise<ITransaction[]>;

  abstract estimateFee(): Promise<string>;

  abstract send(
    userApi: UserApi,
    to: string,
    amount: string,
  ): Promise<{ success: boolean; message?: string }>;
}
