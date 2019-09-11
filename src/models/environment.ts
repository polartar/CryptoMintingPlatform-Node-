import { Schema, model, Document } from 'mongoose';

export interface IWalletEnvironment extends Document {
  walletReferrerReward: number;
  walletCompanyFee: number;
  walletRewardCurrency: string;
  walletRewardAmount: number;
  walletUserBalanceThreshold: number;
  walletShareLimit: number;
}

export const walletEnvironmentSchema = new Schema({
  walletReferrerReward: {
    type: Number,
    required: true,
  },
  walletCompanyFee: {
    type: Number,
    required: true,
  },
  walletRewardCurrency: {
    type: String,
    required: true,
  },
  walletRewardAmount: {
    type: Number,
    required: true,
  },
  walletUserBalanceThreshold: {
    type: Number,
    required: true,
  },
  walletShareLimit: {
    type: Number,
    required: true,
  },
});

export default model<IWalletEnvironment>(
  'environment',
  walletEnvironmentSchema,
);
