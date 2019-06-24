import { Request, Response } from 'express';
import { WalletBase, UserApi, CryptoFavorites } from '../data-sources/';
export interface IUserClaims {
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;
}

export interface Context {
  req: Request;
  res: Response;
  domain: string;
  wallet: {
    coin(symbol: string): WalletBase;
    allCoins(): WalletBase[];
  };
  dataSources: {
    cryptoFavorites: CryptoFavorites;
  };
  user: UserApi | null;
}
