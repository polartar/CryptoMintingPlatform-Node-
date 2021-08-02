import {
  Context,
  IVaultItem,
  IVaultTransaction,
  IVaultGasFee,
  ErrorResponseCode,
  IVaultRetrieveResponseData,
  IVaultItemRequest,
} from '../types';
import  { GreenCoinResult, IVaultItemWithDbRecords} from '../models';
import ResolverBase from '../common/Resolver-Base';
import { addHours } from 'date-fns';
import { logger, config } from '../common';
import { Query } from 'mongoose';
import TokenMinterFactory from '../services/token-generator/token-minter-factory';

class Resolvers extends ResolverBase {
  getVaultItems = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);
    const returnItems: IVaultItem[] = [];

    try {
      const userId = user.userId;
      logger.debug(`resolvers.getVaultItems: ${userId}`);

      const toAdd = await this.searchForCoinResultsSummary(userId, 'green', 'unminted');

      returnItems.push(toAdd.item);
    } catch (err) {
      logger.warn(`resolvers.getVaultItems.catch: ${err}`);
      return {
        success: false,
        message: err,
      };
    }

    return returnItems;
  };

  private searchForCoinResultsSummary = async (
    userId: string,
    symbol: string,
    statusFilter?: string,
  ): Promise<IVaultItemWithDbRecords> => {
    let result: IVaultItem;
    const status: string = statusFilter;
    if(symbol === 'green'){
      const greens = await GreenCoinResult.find({
        userId, 
        status
      }).exec();

      result = {
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
        result.balance = result.balance + +a.greenDecimal;
      });
      
      return { item: result, dbRecords: greens };
    }
    return { item: result, dbRecords: [] };
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

    const min: number = 8500;
    const max: number = 8899;
    const randFee: number = Math.floor(Math.random() * (max - min + 1)) + min;
    const feeAmt: number = randFee / +1000000;

    const returnItem: IVaultGasFee = {
      symbolToMint: coinSymbol,
      symbolAcceptFee: 'ETH',
      amount: feeAmt,
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
    const { coinSymbol } = args;
    const returnItems: IVaultTransaction[] = [];

    try {
      const userId = user.userId;
      logger.debug(`resolvers.getVaultItems: ${userId}`);
      const greens = await GreenCoinResult.find({
        userId,
      })
        .exec();

      greens.forEach(a => {
        const toAdd: IVaultTransaction = {
          created: a.runTime,
          isNft: false,
          status: a.status,
          amount: +a.greenDecimal,
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
    const { user, wallet } = ctx;
    this.requireAuth(user);
    const userId = user.userId;
    const { items, encryptionPasscode } = args;
    const dataResult: IVaultRetrieveResponseData[] = [];

    const coinSearchPromises: Promise<IVaultItemWithDbRecords>[] = [];
    
    //Get unminted balance
    items.forEach(item => {
      try{
        coinSearchPromises.push(this.searchForCoinResultsSummary(userId, item.symbol, 'unminted'));
      }
      catch(err){
        logger.error("error when looking for coins to mint", err, user, items);
      }
    });
    const dbUnmintedItems: IVaultItemWithDbRecords[] = await Promise.all(coinSearchPromises);
    const readyToMint: IVaultItemRequest[] = [];
    const updateResult: Query<any>[] = [];

    //Compare unminted balance
    items.forEach(item => {
      try{
        dbUnmintedItems.forEach(dbUnminted => {
          //Matched DB query, and requested minted items
          if(dbUnminted.item.symbol.toLowerCase() === item.symbol.toLowerCase()){
            if(Math.floor(dbUnminted.item.balance) !== Math.floor(item.amount)) {
              //If we got here, we are cancelling the request. Either the user is 
              //requesting more than "unminted" transactions in the DB, or they have 
              //requested the mint twice at the same time attempting to double reward
              const errorResponse: IVaultRetrieveResponseData = {
                  symbol: item.symbol,
                  amount: item.amount,
                  transactionId: undefined,
                  error: {
                    code: ErrorResponseCode.InternalError,
                    message: "Internal Error - attempted to multi-mint, or invalid amount",
                    stack: undefined,
                  },
                };
                
              dataResult.push(errorResponse);
            }
            else{
              readyToMint.push(item);
              dbUnminted.dbRecords.forEach(coinResult => {
                updateResult.push(coinResult.update({ $set: { 'status': 'begin-mint', 'dateMint': new Date() } }));
              });
            }
          }
        });
      }
      catch(err){
        logger.error("error when looking for coins to mint", err, user, items);
      }
    });
    
    const min: number = 8500;
    const max: number = 8899;
    const randFee: number = Math.floor(Math.random() * (max - min + 1)) + min;
    const feeAmt: number = randFee / +1000000;

    const walletApiGreen = wallet.coin('green');
    const walletResultGreen = await walletApiGreen.getWalletInfo(user);

    const sendFee = await walletApiGreen.send(user, [{to: config.companyFeeBtcAddresses['green'], amount: feeAmt.toString()}], encryptionPasscode);
    //TODO: store the sendFee in DB 
    const minterGreen = await TokenMinterFactory.getTokenMinter('green');

    for(let i = 0; i < readyToMint.length; i++){
      const currSymbol: string = readyToMint[i].symbol;
      const currAmount: number = readyToMint[i].amount;
      if(currSymbol.toLowerCase() === 'green'){
        const greenTx = await minterGreen.mintToGetFromVault({
          destinationAddress: walletResultGreen.receiveAddress, 
          amount: currAmount
        });
        const currResult: IVaultRetrieveResponseData = {
          symbol: currSymbol,
          amount: currAmount,
          transactionId: greenTx.hash,
          error: undefined,
        };
        dataResult.push(currResult);
      }
    }

    return dataResult;
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
