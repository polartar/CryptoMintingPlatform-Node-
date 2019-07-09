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
  ) {
    if (!name)
      throw new Error(
        'No name provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!symbol)
      throw new Error(
        'No symbol provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!backgroundColor)
      throw new Error(
        'No backgroundColor provided in token configuration for wallet interface. This parameter is required.',
      );
    if (!icon)
      throw new Error(
        'No icon provided in token configuration for wallet interface. This parameter is required.',
      );
  }

  abstract getWalletInfo(
    userApi: UserApi,
  ): Promise<{
    receiveAddress: string;
    symbol: string;
    name: string;
    icon: string;
    backgroundColor: string;
  }>;

  abstract getBalance(
    addressOrUserId: string,
  ): Promise<{
    confirmed: string;
    unconfirmed: string;
  }>;

  abstract getTransactions(userApi: UserApi): Promise<ITransaction[]>;

  abstract estimateFee(userApi: UserApi): Promise<string>;

  abstract send(
    userApi: UserApi,
    to: string,
    amount: string,
  ): Promise<{ success: boolean; message?: string }>;
}
