import { model, Schema, Document } from 'mongoose';
import { IGameProduct } from '../types';

export interface IGameProductDocument extends IGameProduct, Document {}

const gameProductSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  coin: {
    type: String,
    enum: ['BTC'],
    required: true,
  },
  game: {
    type: String,
    enum: ['Town Star'],
    required: true,
  },
  nftBaseId: {
    type: String,
    default: null,
  },
  priceUsd: {
    type: Number,
    required: true,
  },
  basePriceUsd: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  quantities: {
    type: [Number],
    required: true,
  },
  rarity: {
    type: {
      icon: {
        type: String,
        required: true,
      },
      label: {
        type: String,
        required: true,
      },
      supplyLimit: {
        type: Number,
        required: true,
      },
    },
    default: null,
  },
});

export const GameProduct = model<IGameProductDocument>(
  'game-product',
  gameProductSchema,
);
