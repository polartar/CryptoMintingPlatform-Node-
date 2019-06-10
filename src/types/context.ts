import { Request, Response } from 'express';
import { WalletBase, Account } from '../data-sources/';

export interface ContextUser {
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;
}

export interface Context {
  req: Request;
  res: Response;
  dataSources: {
    wallet: {
      coin(symbol: string): WalletBase;
      allCoins(): WalletBase[];
    };
    accounts: Account;
  };
  user: ContextUser;
}
