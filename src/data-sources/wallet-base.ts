// This abstract class is intended to provide a framework for each of the wallet interfaces to ensure they implement the same methods and return the same data shape
export default abstract class WalletBase {
  constructor(
    protected name: string,
    protected symbol: string,
    protected contract: string,
  ) {}

  // abstract getTransactions

  abstract getBalance(
    userId: string,
  ): Promise<{
    symbol: string;
    name: string;
    balance: { confirmed: number; unconfirmed: number };
  }>;

  // abstract sendToken
}
