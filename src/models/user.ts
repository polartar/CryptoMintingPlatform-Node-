import * as mongoose from 'mongoose';
import { crypto } from '../utils';

interface IUserWalletDoc extends mongoose.Document {
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
  cryptoFavorites?: string[];
  cryptoFavoritesSet?: boolean;
  ethNonce: number;
  btcAddress?: number;
}
export interface IUser extends mongoose.Document {
  email: string;
  firebaseUid: string;
  role: string;
  created: Date;
  affiliateId: string;
  permissions: string[];
  id: string;
  wallet?: IUserWalletDoc;
  twoFaTempSecret?: string;
  twoFaSecret?: string;
  currency?: string;
}

const walletSchema = new mongoose.Schema({
  ethAddress: String,
  ethBlockNumAtCreation: Number,
  cryptoFavorites: [String],
  cryptoFavoritesSet: Boolean,
  ethNonce: {
    type: Number,
    default: 0,
  },
  btcAddress: String,
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  affiliateId: String,
  phoneCountry: String,
  phone: String,
  referredBy: {
    type: String,
    default: null,
  },
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
  role: {
    type: String,
    default: 'member',
  },
  created: { type: Date, index: true },
  permissions: {
    type: [String],
    default: [],
  },
  id: { type: String, index: true },
  twoFaTempSecret: String,
  twoFaSecret: String,
  wallet: walletSchema,
  currency: {
    type: String,
    default: 'USD',
  },
});

userSchema.post('save', function(doc: IUser) {
  if (!doc._id) {
    return;
  }
  const id = doc._id.toString();
  if (doc.id !== id) {
    doc.id = id;
    const affiliateId = Buffer.from(crypto.hash(doc.email));
    doc.affiliateId = affiliateId.toString('base64');
    doc.created = new Date();
    return doc.save();
  }
});

const User = mongoose.model<IUser>('user', userSchema);

export default User;
