import {
  Context,
  IVaultItem,
  IVaultTransaction,
  IVaultGasFee,
  ErrorResponseCode,
  IVaultRetrieveResponseData,
  IVaultItemRequest,
  IVaultRetrieveResponse,
} from '../types';
import {
  GreenCoinResult,
  IVaultItemWithDbRecords,
  NotificationStatus,
} from '../models';
import ResolverBase from '../common/Resolver-Base';
import { addHours } from 'date-fns';
import { logger, config, notify } from '../common';
import TokenMinterFactory from '../services/token-generator/token-minter-factory';
import { EthWallet } from '../wallet-api/coin-wallets';

class Resolvers extends ResolverBase {
  getVaultItems = async (parent: any, args: {}, ctx: Context) => {
    const { user } = ctx;
    this.requireAuth(user);
    const returnItems: IVaultItem[] = [];

    try {
      const userId = user.userId;
      logger.debug(`resolvers.getVaultItems: ${userId}`);

      const toAdd = await this.searchForCoinResultsSummary(
        userId,
        'green',
        'unminted',
      );

      //TODO : taken out to show '0' balance (to then see the transactions details.)
      //if (toAdd.item.balance > 0) {
      returnItems.push(toAdd.item);
      //}
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
    if (symbol.toLowerCase() === 'green') {
      const greens = await GreenCoinResult.find({
        userId,
        status,
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
          amount: this.gasRandom(),
          expires: addHours(Date.now(), 1),
          name: 'Gas Fees',
        },
      };

      greens.forEach(a => {
        result.balance = result.balance + +a.greenDecimal;
      });

      const resultCombined: IVaultItemWithDbRecords = {
        item: result,
        dbRecords: greens,
      };
      return resultCombined;
    }
    return { item: result, dbRecords: [] };
  };

  private gasRandom = () => {
    const min: number = 8500;
    const max: number = 8899;
    const randFee: number = Math.floor(Math.random() * (max - min + 1)) + min;
    const feeAmt: number = randFee / +1000000;
    return feeAmt;
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
      amount: this.gasRandom(),
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
      }).exec();

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
          symbol: coinSymbol,
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
    const ethWallet = wallet.coin('ETH') as EthWallet;

    try {
      const correctPassword = await ethWallet.checkPassword(
        user,
        encryptionPasscode,
      );
      if (!correctPassword) {
        const errorReturn: IVaultRetrieveResponse = {
          data: undefined,
          error: {
            code: ErrorResponseCode.InvalidEncryptionPassword,
            message: 'Invalid Encryption Passcode',
            stack: undefined,
          },
        };
        return errorReturn;
      }
    } catch (err) {
      logger.error('checking password failed', { err, user });
      const errorReturn: IVaultRetrieveResponse = {
        data: undefined,
        error: {
          code: ErrorResponseCode.InternalError,
          message: 'Internal Error: Password Validation.',
          stack: undefined,
        },
      };
      return errorReturn;
    }

    //Get unminted balance
    items.forEach(item => {
      try {
        coinSearchPromises.push(
          this.searchForCoinResultsSummary(userId, item.symbol, 'unminted'),
        );
      } catch (err) {
        logger.error(
          'error when looking for coins to mint : ' +
            JSON.stringify({ err, user, items }),
        );
      }
    });
    const dbUnmintedItems: IVaultItemWithDbRecords[] = await Promise.all(
      coinSearchPromises,
    );
    const readyToMint: IVaultItemRequest[] = [];
    const updateResult: Promise<any>[] = [];

    //Compare unminted balance
    items.forEach(item => {
      try {
        dbUnmintedItems.forEach(dbUnminted => {
          //Matched DB query, and requested minted items
          if (
            dbUnminted.item.symbol.toLowerCase() === item.symbol.toLowerCase()
          ) {
            if (
              Math.floor(dbUnminted.item.balance) !== Math.floor(item.amount)
            ) {
              //If we got here, we are cancelling the request. Either the user is
              //requesting more than "unminted" transactions in the DB, or they have
              //requested the mint twice at the same time attempting to double reward
              const errorResponse: IVaultRetrieveResponseData = {
                symbol: item.symbol,
                amount: item.amount,
                transactionId: undefined,
                error: {
                  code: ErrorResponseCode.InternalError,
                  message:
                    'Internal Error - attempted to multi-mint, or invalid amount',
                  stack: undefined,
                },
              };

              notify.notifyUser(
                userId,
                'User Minting Hack/Mash',
                `User is either mashing button to mint over and over, or is attempting to hack the blockchain. ${item.symbol} 
                attempted: ${item.amount} / DB Available: ${dbUnminted.item.balance}`,
                NotificationStatus.hidden,
              );

              dataResult.push(errorResponse);
            } else {
              readyToMint.push(item);
              try {
                updateResult.push(
                  this.updateMultipleCoinRecords(
                    userId,
                    'unminted',
                    'begin-mint',
                  ),
                );
              } catch (err) {
                logger.error(
                  "error when tryign to set to 'begin-mint' : " +
                    err.message +
                    ' : ' +
                    JSON.stringify({ err, dbUnminted }),
                );
              }
            }
          }
        });
      } catch (err) {
        logger.error(
          'error when looking for coins to mint : ' +
            JSON.stringify({ err, item, readyToMint, user }),
        );
      }
    });

    logger.warn(
      'checking request : ' +
        JSON.stringify({ items, dbUnmintedItems, readyToMint, user, wallet }),
    );

    const feeAmt = this.gasRandom();

    const walletResultGreen = await ethWallet.getWalletInfo(user);
    const sendFee = await ethWallet.send(
      user,
      [{ to: config.claimFeeReceiveAddress, amount: feeAmt.toString() }],
      encryptionPasscode,
    );

    logger.debug(
      'User sent vault fee to company wallet.' + JSON.stringify(sendFee),
    );

    //TODO: store the sendFee in DB
    const minterGreen = await TokenMinterFactory.getTokenMinter('green');

    for (const ready of readyToMint) {
      const currSymbol: string = ready.symbol;
      const currAmount: number = ready.amount;
      const currResult: IVaultRetrieveResponseData = {
        symbol: currSymbol,
        amount: currAmount,
        transactionId: undefined,
        error: undefined,
      };

      try {
        if (currSymbol.toLowerCase() === 'green') {
          const greenTx = await minterGreen.mintToGetFromVault({
            destinationAddress: walletResultGreen.receiveAddress,
            amountDecimal: currAmount,
          });

          currResult.transactionId = greenTx.hash;
        }
        try {
          await this.updateMultipleCoinRecords(userId, 'begin-mint', 'minted');

          notify.notifyUser(
            userId,
            'Successful retrieving from Vault',
            `You successfully retrieved ${currAmount} ${currSymbol} from the Vault. To see the transaction on the blockchain, see https://etherscan.io/tx/${currResult.transactionId}`,
            NotificationStatus.unread,
          );
        } catch (err2) {
          notify.notifyUser(
            userId,
            "User Minted Successfully, but DB didn't update",
            `User had trouble updating DB. Mint was successful, but transactions did not mark 'status': 'minted'. ${currSymbol} 
                amount: ${currAmount} | tx: ${currResult.transactionId}`,
            NotificationStatus.hidden,
          );
          logger.error(
            "MINTED, but status didn't get set to 'minted' : " +
              JSON.stringify({
                err2,
                currSymbol,
                currAmount,
                dataResult,
                user,
              }),
          );
        }
      } catch (err) {
        logger.error(
          'MINT error : ' +
            JSON.stringify({ err, currSymbol, currAmount, dataResult, user }),
        );
        currResult.error = {
          code: ErrorResponseCode.InternalError,
          message: 'Internal Error - attempt to mint resulted in failure',
          stack: undefined,
        };
      }

      dataResult.push(currResult);
    }

    const toReturn: IVaultRetrieveResponse = {
      data: dataResult,
      error: undefined,
    };
    return toReturn;
  };

  private updateMultipleCoinRecords = async (
    userId: string,
    prevStatus: string,
    newStatus: string,
  ) => {
    return await GreenCoinResult.updateMany(
      { userId, status: prevStatus },
      { $set: { status: newStatus, dateMint: new Date() } },
    );
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
