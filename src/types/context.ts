import { Request, Response } from 'express';
import { Wallet } from '../data-sources';
import { WalletBase } from '../data-sources/';

export interface Context {
  req: Request;
  res: Response;
  dataSources: {
    wallet: {
      [key: string]: WalletBase;
    };
  };
  user: {
    permissions: string[];
    role: string;
    userId: string;
    authorized: boolean;
    twoFaEnabled: boolean;
  };
}
