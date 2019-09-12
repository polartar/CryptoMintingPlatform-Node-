import * as mongoose from 'mongoose';
import { crypto } from '../utils';

interface IUserWalletDoc extends mongoose.Document {
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
  cryptoFavorites?: string[];
  cryptoFavoritesSet?: boolean;
  ethNonce: number;
  btcAddress?: number;
  activated: boolean;
}
export interface IUser extends mongoose.Document {
  email: string;
  firebaseUid: string;
  firstName: string;
  lastName: string;
  role: string;
  created: Date;
  affiliateId: string;
  permissions: string[];
  id: string;
  wallet?: IUserWalletDoc;
  twoFaTempSecret?: string;
  twoFaSecret?: string;
  currency?: string;
  number: string;
  getNextNumber: () => string | undefined;
}

async function getNextNumber({ firstName, lastName }: IUser) {
  const { sequence: id } = await mongoose.connection.db
    .collection('sequences')
    .findOne({ name: 'users' });
  if (id && firstName && firstName.length && lastName.length) {
    const firstChar = firstName.substring(0, 1);
    const lastChar = lastName.substring(0, 1);
    const padded = id.toString().padStart(6, '0');
    const number = `${firstChar}${lastChar}${padded}`.toLowerCase();
    return number;
  }
  return undefined;
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
  activated: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    secondaryEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      index: true,
      default: 'member',
    },
    phone: String,
    phoneCountry: String,
    affiliateId: { type: String, index: true },
    referredBy: { type: String, index: true },
    language: String,
    created: { type: Date, index: true },
    id: { type: String, index: true },
    firebaseUid: {
      type: String,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    twoFaTempSecret: String,
    twoFaSecret: String,
    walletAddresses: Array,
    number: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    wallet: walletSchema,
  },
  { id: false },
);
userSchema.pre('save', async function(this: IUser, next) {
  const user = this;
  if (user.email) {
    user.email = user.email.toLowerCase();
    user.affiliateId =
      user.affiliateId || crypto.MD5(user.email).toString(crypto.enc.Base64);
  }
  if (!user.number) {
    const number = await getNextNumber(user);
    if (number) {
      user.number = number;
    }
  }
  if (!user.created) {
    user.created = new Date();
  }
  next();
});
userSchema.post('save', async function(
  doc: IUser,
  next: mongoose.HookNextFunction,
) {
  if (!doc._id) {
    return;
  }
  const id = doc._id.toString();
  if (doc.id !== id) {
    doc.id = id;
    try {
      doc.save();
    } catch (err) {
      next(err);
    }
  }
});
userSchema.post('insertMany', async function(
  doc: IUser,
  next: mongoose.HookNextFunction,
) {
  if (!doc._id) {
    return;
  }
  const id = doc._id.toString();
  if (doc.id !== id) {
    doc.id = id;
    try {
      doc.save();
    } catch (err) {
      next(err);
    }
  }
});

const User = mongoose.model<IUser>('user', userSchema);

export default User;
