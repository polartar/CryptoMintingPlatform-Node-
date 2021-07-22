import { model, Schema, Document } from 'mongoose';
import { IGreenCoinResult } from '../types';
import { orderContextSchema } from './schemas';

export interface IGreenCoinResultDocument extends IGreenCoinResult, Document {}

export const greenCoinSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  greenDecimal: {
    type: Number,
    required: true,
  },
  runTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },  
});

export const GreenCoinResult = model<IGreenCoinResultDocument>(
  'green-test-coins-result',
  greenCoinSchema,
);
