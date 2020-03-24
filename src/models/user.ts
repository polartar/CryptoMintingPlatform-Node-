import * as mongoose from 'mongoose';
import { crypto } from '../utils';
import { IUtmInfo } from '../types';
import { utmSchema } from './schemas';

interface IWalletShares {
  green: number;
  arcade: number;
  codex: number;
  connect: number;
  [key: string]: number;
}

interface IWalletUpgrade {
  activated: boolean;
  activationTxHash: string;
  btcToCompany: number;
  btcToReferrer: number;
  btcUsdPrice: number;
  amountRewarded: number;
  itemsRewarded: string[];
  rewardId: string;
  timestamp: Date;
  lootBoxExtraPaid: number;
  lootBoxesPurchased: number;
  lootBoxPriceUsd: number;
  utm: IUtmInfo;
}
interface IActivatedWallets {
  green: IWalletUpgrade;
  arcade: IWalletUpgrade;
  winx: IWalletUpgrade;
  [key: string]: IWalletUpgrade;
}

export interface IUserWalletDoc extends mongoose.Document {
  ethAddress?: string;
  ethBlockNumAtCreation?: number;
  cryptoFavorites?: string[];
  cryptoFavoritesSet?: boolean;
  ethNonce: number;
  btcAddress?: string;
  activations: IActivatedWallets;
  shareLink?: string;
  userCreatedInWallet: boolean;
  shares: IWalletShares;
}

interface ISoftNodeLicenses {
  [key: string]: number;
}
export interface IUser extends mongoose.Document {
  email: string;
  firebaseUid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  created: Date;
  utmInfo: string[];
  affiliateId: string;
  referredBy: string;
  permissions: string[];
  id: string;
  wallet?: IUserWalletDoc;
  language: string;
  twoFaTempSecret?: string;
  twoFaSecret?: string;
  currency?: string;
  number: string;
  softNodeLicenses: ISoftNodeLicenses;
  getNextNumber: () => string | undefined;
  profilePhotoUrl: string;
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
const activatedWalletsSchema = new mongoose.Schema({
  activated: {
    type: Boolean,
    default: false,
  },
  activationTxHash: String,
  btcToCompany: Number,
  btcToReferrer: Number,
  btcUsdPrice: Number,
  amountRewarded: Number,
  itemsRewarded: [String],
  rewardId: String,
  timestamp: Date,
  lootBoxExtraPaid: Number,
  lootBoxesPurchased: Number,
  lootBoxPriceUsd: Number,
  utm: {
    type: utmSchema,
    default: {
      medium: '',
      source: '',
      campaign: '',
      term: '',
    },
  },
});

const walletsActivated = new mongoose.Schema({
  green: activatedWalletsSchema,
  winx: activatedWalletsSchema,
  arcade: activatedWalletsSchema,
});

const walletShareSchema = new mongoose.Schema({
  green: Number,
  arcade: Number,
  connect: Number,
  codex: Number,
  localhost: Number,
});

const walletSchema = new mongoose.Schema(
  {
    ethAddress: String,
    ethBlockNumAtCreation: Number,
    cryptoFavorites: [String],
    cryptoFavoritesSet: Boolean,
    ethNonce: {
      type: Number,
      default: 0,
    },
    btcAddress: String,
    shareLink: String,
    userCreatedInWallet: Boolean,
    activations: {
      type: walletsActivated,
      default: {},
    },
    shares: {
      type: walletShareSchema,
      default: {},
    },
  },
  { timestamps: true },
);

export const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    displayName: String,
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
    softNodeLicenses: {
      green: Number,
      codex: Number,
      arcade: Number,
      connect: Number,
    },
    profilePhotoUrl: String,
    utmInfo: {
      type: [String],
      default: [],
    },
  },
  { id: false },
);

userSchema.pre('save', async function(this: IUser, next) {
  const user = this;
  if (user.email) {
    user.email = user.email.toLowerCase();
    user.affiliateId = user.affiliateId || crypto.md5UrlSafe(user.email);
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
