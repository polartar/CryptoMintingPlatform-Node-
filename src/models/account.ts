import * as mongoose from 'mongoose';

export interface IAccount extends mongoose.Document {
  userId: string;
  accountName: string;
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
}

const accountSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  ethAddress: String,
  ethBlockNumAtCreation: Number,
});

const Account = mongoose.model<IAccount>('account', accountSchema);

export default Account;
