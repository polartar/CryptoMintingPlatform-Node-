import * as mongoose from 'mongoose';
import { IWalletTransaction } from '../types';
require('mongoose-long')(mongoose);

const schemaTypes = mongoose.Schema.Types as any;

const walletTransactionSchema = new mongoose.Schema<IWalletTransaction>({
  type: String,
  status: String,
  timestamp: Number,
  to: String,
  from: String,
  amount: schemaTypes.Long,
  fullHexAmount: String,
  decimalsStored: Number,
  blockNumber: Number,
  gasPriceHex: String,
  gasUsedHex: String,
  gasPrice: schemaTypes.Long,
  gasPriceDecimals: Number,
  gasUsed: schemaTypes.Long,
  hash: String,
  nonce: Number,
  toUser: String,
  fromUser: String,
  baseId: String,
  tokenId: String,
  logIndex: Number, // Null for ETH
  batchIndex: Number, // Null for ETH and ERC20
  batchCount: Number, // number of batched events in a single transaction
  nft: Boolean, // Only added to 1155 NFTs
  lootBoxUnopened: Boolean,
  contractMethod: String,
  contractType: String,
  mintTransaction: Boolean,
  assignedNode: {
    hardwareId: String,
    licenseId: String,
    ethAddress: String,
    userId: String,
  },
});

export const WalletTransaction = mongoose.model<
  mongoose.Document & IWalletTransaction
>('wallet-transaction', walletTransactionSchema);
