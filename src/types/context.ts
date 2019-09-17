import { Request, Response } from 'express';
import {
  UserApi,
  CryptoFavorites,
  Environment,
  Bitly,
  Zendesk,
} from '../data-sources/';
import { WalletApi } from '../wallet-api';
export interface IUserClaims {
  permissions: string[];
  role: string;
  userId: string;
  authorized: boolean;
  twoFaEnabled: boolean;
  [prop: string]: any;
}

export interface Context {
  req: Request;
  res: Response;
  wallet: WalletApi;
  dataSources: {
    cryptoFavorites: CryptoFavorites;
    environment: Environment;
    bitly: Bitly;
    zendesk: Zendesk;
  };
  user: UserApi | null;
}
