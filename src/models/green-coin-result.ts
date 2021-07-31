import { Schema, model, Document } from 'mongoose';
import { IVaultItem } from '../types';

export interface IGreenCoinResultDocument extends Document {
  userId: string;
  greenDecimal: string;
  status: string;
  runTime: Date;
  dateMint?: Date;
}

export interface IVaultItemWithDbRecords {
  item: IVaultItem;
  dbRecords: IGreenCoinResultDocument[];
}

export const greenCoinResultSchema = new Schema({
  userId: String,
  greenDecimal: String,
  status: String,
  runTime: Date,
  dateMint: Date,
});

const GreenCoinResult = model<IGreenCoinResultDocument>('green-test-coins-result', greenCoinResultSchema);

export default GreenCoinResult;