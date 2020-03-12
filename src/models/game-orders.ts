import { model, Schema, Document } from 'mongoose';
import { IGameOrder } from '../types';

export interface IGameOrderDocument extends IGameOrder, Document {}

export const gameOrderSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  perUnitPriceUsd: {
    type: Number,
    required: true,
  },
  gameProductId: {
    type: Schema.Types.ObjectId,
    ref: 'game-product',
    required: true,
  },
  btcUsdPrice: Number,
  totalBtc: {
    type: Number,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
  },
  isUpgradeOrder: {
    type: Boolean,
    default: false,
  },
  itemsReceived: {
    type: [String],
    required: true,
  },
  created: Date,
});

export const GameOrder = model<IGameOrderDocument>(
  'game-order',
  gameOrderSchema,
);
