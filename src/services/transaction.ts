import { utils, providers } from 'ethers';
import * as erc1155Abi from '../common/ABI/erc1155.json';
import { BigNumber } from 'ethers/utils';
import { IWalletTransaction } from '../types';
import { WalletTransaction, User } from '../models';
import {
  ethBalanceTransactionsPipeline,
  IEthBalanceTransactions,
} from '../pipelines';

class TransactionService {
  erc1155Interface = new utils.Interface(erc1155Abi);
  storeDecimalsFungible = 8;
  TYPE_NF_BIT = BigInt(1) << BigInt(255);
  NF_INDEX_MASK = BigInt(~0) << BigInt(128);

  private isNonFungible = (tokenId: string) => {
    return (BigInt(tokenId) & this.TYPE_NF_BIT) === this.TYPE_NF_BIT;
  };

  private getBaseType = (tokenId: string) => {
    if (this.isNonFungible(tokenId)) {
      const token = BigInt(tokenId);
      return '0x' + (token & this.NF_INDEX_MASK).toString(16);
    }
    return tokenId;
  };

  private parseAmount = (
    tokenId: string,
    value: BigNumber,
    decimals: number,
  ) => {
    const sliceEnd = this.storeDecimalsFungible - decimals;
    const amountString = value.toString();
    const fullHexAmount = value.toHexString();
    const isNonFungible = this.isNonFungible(tokenId);
    const amount =
      !isNonFungible && sliceEnd < 0
        ? amountString.slice(0, sliceEnd)
        : amountString;
    return {
      amount,
      fullHexAmount,
      decimalsStored: isNonFungible ? 0 : this.storeDecimalsFungible,
    };
  };

  parseTokenId = (tokenId: string) => {
    return {
      tokenId,
      baseId: this.getBaseType(tokenId),
      nft: this.isNonFungible(tokenId),
    };
  };

  getUserIdByEthAddress = async (ethAddress: string) => {
    const user = await User.findOne({ 'wallet.ethAddress': ethAddress });

    return user?.id || null;
  };

  parseData = async (data: string, toUserId?: string) => {
    const { name, args } = this.erc1155Interface.parseTransaction({
      data,
      value: '0x0',
    });
    if (name === 'safeTransferFrom') {
      const [from, to, id, value] = args as [
        string,
        string,
        BigNumber,
        BigNumber,
      ];
      return {
        from,
        to,
        fullHexAmount: value.toHexString(),
        logIndex: 0,
        contractMethod: name,
        mintTransaction: false,
        toUser: toUserId ? toUserId : await this.getUserIdByEthAddress(to),
        ...this.parseAmount(id.toHexString(), value, 8),
        ...this.parseTokenId(id.toHexString()),
      };
    }
  };

  saveToDatabase(tx: IWalletTransaction) {
    return WalletTransaction.create(tx);
  }

  getEthBalanceAndTransactions = async (ethAddress: string) => {
    const [result] = (await WalletTransaction.aggregate(
      ethBalanceTransactionsPipeline(ethAddress),
    )) as IEthBalanceTransactions[];

    return result
      ? result
      : ({
          transactions: [],
          total: '0.0',
        } as IEthBalanceTransactions);
  };

  savePendingErc1155Transaction = async (
    txResponse: providers.TransactionResponse,
    fromUserId: string,
    toUserId?: string,
  ) => {
    const { data, gasPrice, nonce, blockNumber, hash, timestamp } = txResponse;
    const dataValues = await this.parseData(data, toUserId);
    if (!dataValues) return;

    return this.saveToDatabase({
      type: 'Gala',
      contractType: 'ERC1155',
      status: blockNumber ? 'confirmed' : 'pending',
      blockNumber: blockNumber || null,
      gasPriceHex: gasPrice.toHexString(),
      gasUsedHex: '',
      gasUsed: null,
      gasPrice: gasPrice.toString(),
      gasPriceDecimals: 18,
      hash,
      nonce,
      fromUser: fromUserId,
      timestamp: timestamp || Date.now(),
      ...dataValues,
    });
  };
}

export const transactionService = new TransactionService();
