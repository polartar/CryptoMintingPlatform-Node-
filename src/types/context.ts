import { Request, Response } from 'express';
import { UserAPI } from '../data-sources';

export interface Context {
  req: Request;
  res: Response;
  dataSources: {
    user: UserAPI;
  };
  user: {
    permissions: string[];
    role: string;
    userId: string;
    authorized: boolean;
    twoFaEnabled: boolean;
  };
}
