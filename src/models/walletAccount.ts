import * as mongoose from 'mongoose';

export interface IWalletAccount extends mongoose.Document {
  userId: string;
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
}

const accountSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
    required: true,
  },
  ethAddress: String,
  ethBlockNumAtCreation: Number,
});

const Account = mongoose.model<IWalletAccount>('walletAccount', accountSchema);

export default Account;
