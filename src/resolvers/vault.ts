import {
  Context,
  IVaultItem,
  IVaultTransaction,
  IVaultGasFee,
  ErrorResponseCode,
  IVaultRetrieveResponse,
  IVaultRetrieveResponseData,
  IVaultItemRequest,
} from '../types';
import { GreenCoinResult } from '../models';
import ResolverBase from '../common/Resolver-Base';
import { addHours } from 'date-fns';
import { logger } from '../common';

class Resolvers extends ResolverBase {
  getVaultItems = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);
    const returnItems: IVaultItem[] = [];

    try {
      const userId = ctx.user.userId;
      const now = Date.now();
      logger.debug(`resolvers.getVaultItems: ${userId}`);
      const greens = await GreenCoinResult.find({
        userId,
        status: 'unminted'
      })
        .exec();
      
      const toAdd: IVaultItem = {
        contractAddress: '0xa280eed7be2121b84cae9e4d0760fad1992c0278',
        name: 'Green',
        symbol: 'GREEN',
        icon:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI3LjY1IDU0LjQ3NWMxNS4wNDItLjIyNiAyNy4wNTItMTIuNjA0IDI2LjgyNS0yNy42NDZDNTQuMjUgMTEuNzg3IDQxLjg3MS0uMjIzIDI2LjgzLjAwMyAxMS43ODcuMjMtLjIyMyAxMi42MDcuMDAzIDI3LjY1LjIzIDQyLjY5MiAxMi42MDcgNTQuNzAyIDI3LjY1IDU0LjQ3NXptMS45NDMtNDMuODgybC0xMiAxOWgxMGwtMiAxNCAxMi0xOC05LTEgMS0xNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
        balance: 0,
        fees: {
            symbolToMint: 'GREEN',
            symbolAcceptFee: 'ETH',
            amount: 0.04,
            expires: addHours(Date.now(), 1),
            name: 'Gas Fees',
          },
      };

      greens.forEach(a => {
        toAdd.balance = toAdd.balance + a.greenDecimal;
      });

      returnItems.push(toAdd);
    } catch (err) {
      logger.warn(`resolvers.getVaultItems.catch: ${err}`);
      return {
        success: false,
        message: err,
      };
    }

    return returnItems;
  };

  getGasFees = async (
    parent: any,
    args: {
      coinSymbol: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { coinSymbol } = args;

    const returnItem: IVaultGasFee = {
      symbolToMint: coinSymbol,
      symbolAcceptFee: 'ETH',
      amount: 0.04,
      expires: addHours(Date.now(), 1),
      name: 'Gas Fees',
    };
    return returnItem;
  };

  getVaultTransactions = async (
    parent: any,
    args: {
      coinSymbol: string;
      filterType?: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { coinSymbol, filterType } = args;
    const returnItems: IVaultTransaction[] = [];

    try {
      //const userId = ctx.user.userId;
      const userId = '5ad15c78fc8df60e43086c20';
      const now = Date.now();
      logger.debug(`resolvers.getVaultItems: ${userId}`);
      const greens = await GreenCoinResult.find({
        userId,
      })
        .exec();
      console.log(greens);

      greens.forEach(a => {
        const toAdd: IVaultTransaction = {
          created: a.runTime,
          isNft: false,
          status: a.status,
          amount: a.greenDecimal,
          userId: a.userId,
          dateMint: a.dateMint,
          tokenId: undefined,
          txMint: undefined,
          symbol: coinSymbol
        };
        returnItems.push(toAdd);
      });

    } catch (err) {
      logger.warn(`resolvers.getVaultItems.catch: ${err}`);
      return {
        success: false,
        message: err,
      };
    }

    return returnItems;
  };

  mint = async (
    parent: any,
    args: {
      items: IVaultItemRequest[];
      encryptionPasscode: string;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { items, encryptionPasscode } = args;

    const dataResultSuccess: IVaultRetrieveResponseData[] = [];
    items.forEach(inputItem => {
      const thisItem: IVaultRetrieveResponseData = {
        symbol: inputItem.symbol,
        amount: inputItem.amount,
        transactionId:
          '0x8aa729950e72a506616209862183af9cc3f914b538456a0767a57486854cedcf',
        error: undefined,
      };
      dataResultSuccess.push(thisItem);
    });
    const responseSuccess: IVaultRetrieveResponse = {
      data: dataResultSuccess,
      error: undefined,
    };

    const dataResultFailure: IVaultRetrieveResponseData[] = [];
    items.forEach(item => {
      const thisItem: IVaultRetrieveResponseData = {
        symbol: item.symbol,
        amount: item.amount,
        transactionId: undefined,
        error: {
          code: ErrorResponseCode.InternalError,
          message: "Internal Error - can't communicate with blockchain",
          stack: undefined,
        },
      };
      dataResultFailure.push(thisItem);
    });
    const responseFailure: IVaultRetrieveResponse = {
      data: dataResultFailure,
      error: undefined,
    };

    const responsePassword: IVaultRetrieveResponse = {
      data: undefined,
      error: {
        code: ErrorResponseCode.InvalidEncryptionPassword,
        message: 'Invalid password',
        stack: undefined,
      },
    };

    const responseGlobal: IVaultRetrieveResponse = {
      data: undefined,
      error: {
        code: ErrorResponseCode.InternalError,
        message: 'Internal Error',
        stack: undefined,
      },
    };

    switch (encryptionPasscode.toLowerCase()) {
      case 'error':
        return responseFailure;
      case 'password':
        return responsePassword;
      case 'internal':
        return responseGlobal;
      default:
        return responseSuccess;
    }
  };
}

const resolvers = new Resolvers();

export default {
  Mutation: {
    vault: resolvers.getVaultItems,
    vaultGas: resolvers.getGasFees,
    vaultRetrieve: resolvers.mint,
    vaultTransactions: resolvers.getVaultTransactions,
  },
};
