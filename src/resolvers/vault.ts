import { Context, IVault, IVaultTransaction, IVaultGasFee } from '../types';
import ResolverBase from '../common/Resolver-Base';
import { addHours, addDays } from 'date-fns';

class Resolvers extends ResolverBase {
  getVaultItems = async (
    parent: any,
    args: {},
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);

    const returnItems: IVault[] = [{
      contractAddress: '0xa280eed7be2121b84cae9e4d0760fad1992c0278',
      name: 'Green',
      symbol: 'GREEN',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI3LjY1IDU0LjQ3NWMxNS4wNDItLjIyNiAyNy4wNTItMTIuNjA0IDI2LjgyNS0yNy42NDZDNTQuMjUgMTEuNzg3IDQxLjg3MS0uMjIzIDI2LjgzLjAwMyAxMS43ODcuMjMtLjIyMyAxMi42MDcuMDAzIDI3LjY1LjIzIDQyLjY5MiAxMi42MDcgNTQuNzAyIDI3LjY1IDU0LjQ3NXptMS45NDMtNDMuODgybC0xMiAxOWgxMGwtMiAxNCAxMi0xOC05LTEgMS0xNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
      balance: '32382',
      fees: {
        symbolToMint: 'GREEN',
        symbolAcceptFee: 'ETH',
        amount: .01,
        expires: addHours(Date.now(), 1),
        name: 'Gas Fees'
      }
    },
    {
      contractAddress: '0xa280eed7be2121b84cae9e4d0760fad1992c0278',
      name: 'Win',
      symbol: 'WIN',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI4LjA1NyA1NC44ODNjMTUuMDQyLS4yMjcgMjcuMDUyLTEyLjYwNSAyNi44MjYtMjcuNjQ3QzU0LjY1NiAxMi4xOTQgNDIuMjc4LjE4NCAyNy4yMzYuNDEgMTIuMTk0LjYzNy4xODQgMTMuMDE1LjQxIDI4LjA1N2MuMjI3IDE1LjA0MiAxMi42MDUgMjcuMDUyIDI3LjY0NyAyNi44MjZ6TTEwIDE3aDVsNC41IDE0LjUgNi0xNC41SDI5bDYgMTQuNUw0MC41IDE3SDQ1bC03IDIxLjVoLTQuNWwtNi0xNC41TDIyIDM4LjVoLTQuNUwxMCAxN3oiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
      balance: '195057853',
      fees: {
        symbolToMint: 'WIN',
        symbolAcceptFee: 'ETH',
        amount: .02,
        expires: addHours(Date.now(), 1),
        name: 'Gas Fees'
      }
    }];

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
      amount: .01,
      expires: addHours(Date.now(), 1),
      name: 'Gas Fees'
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

    // if(!filterType){
    //   filterType = 'unminted';
    // }
    const returnItems: IVaultTransaction[] = [{
      symbol: 'GREEN',
      amount: '8334',
      created: addDays(new Date(), -5),
      isNft: false,
      status: 'pending',
      userId: user.userId,
      dateMint: undefined,
      tokenId: undefined,
      txMint: undefined,
    },{
      symbol: 'GREEN',
      amount: '7290',
      created: addDays(new Date(), -4),
      isNft: false,
      status: 'pending',
      userId: user.userId,
      dateMint: undefined,
      tokenId: undefined,
      txMint: undefined,
    },{
      symbol: 'GREEN',
      amount: '8161',
      created: addDays(new Date(), -3),
      isNft: false,
      status: 'pending',
      userId: user.userId,
      dateMint: undefined,
      tokenId: undefined,
      txMint: undefined,
    },{
      symbol: 'GREEN',
      amount: '8597',
      created: addDays(new Date(), -2),
      isNft: false,
      status: 'pending',
      userId: user.userId,
      dateMint: undefined,
      tokenId: undefined,
      txMint: undefined,
    }];

    return returnItems;
  };

  mint = async (
    parent: any,
    args: {
      coinSymbol: string;
      amount: number;
    },
    ctx: Context,
  ) => {
    const { user } = ctx;
    this.requireAuth(user);
    const { coinSymbol, amount } = args;

    return {
      data: {
        status: 'Success',
        coinSymbol: coinSymbol,
        amount: amount.toString()
      },
      error: {}
    };
  };

}

const resolvers = new Resolvers();

export default {
  Mutation: {
    vault: resolvers.getVaultItems,
    vaultGas: resolvers.getGasFees,
    vaultRetrieve: resolvers.mint,
    vaultTransactions: resolvers.getVaultTransactions
  },
};
