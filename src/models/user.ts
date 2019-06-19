import * as mongoose from 'mongoose';

interface IUserWalletDoc extends mongoose.Document {
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
  cryptoFavorites?: string[];
  cryptoFavoritesSet?: boolean;
}
export interface IUser extends mongoose.Document {
  email: string;
  firebaseUid: string;
  role: string;
  created: Date;
  permissions: string[];
  id: string;
  wallet?: IUserWalletDoc;
  twoFaTempSecret?: string;
  twoFaSecret?: string;
}

const walletSchema = new mongoose.Schema({
  ethAddress: String,
  ethBlockNumAtCreation: Number,
  cryptoFavorites: [String],
  cryptoFavoritesSet: Boolean,
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  firebaseUid: {
    type: String,
    unique: true,
    trim: true,
    index: true,
  },
  role: String,
  created: { type: Date, index: true },
  permissions: [String],
  id: { type: String, index: true },
  twoFaTempSecret: String,
  twoFaSecret: String,
  wallet: walletSchema,
});

userSchema.post('save', function(doc: IUser) {
  if (!doc._id) {
    return;
  }
  const id = doc._id.toString();
  if (doc.id !== id) {
    doc.id = id;
    doc.save();
  }
});

export default userSchema;
