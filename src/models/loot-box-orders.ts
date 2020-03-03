import { model, Schema, Document } from 'mongoose';
import { ILootBoxOrder } from '../types';

export interface ILootBoxOrderDocument extends ILootBoxOrder, Document {}

export const lootBoxOrderSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
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
});

export const LootBoxOrder = model<ILootBoxOrderDocument>(
  'loot-box-order',
  lootBoxOrderSchema,
);
