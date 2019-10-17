import { Schema, model, Document } from 'mongoose';

export interface IWalletConfig extends Document {
  referrerReward: number;
  companyFee: number;
  rewardCurrency: string;
  rewardAmount: number;
  userBalanceThreshold: number;
  shareLimit: number;
  shareLinkBase: string;
}

export const walletConfigSchema = new Schema({
  brand: {
    type: String,
    enum: ['localhost', 'green', 'arcade', 'codex', 'connect'],
  },
  referrerReward: {
    type: Number,
    required: true,
  },
  companyFee: {
    type: Number,
    required: true,
  },
  rewardCurrency: {
    type: String,
    required: true,
  },
  rewardAmount: {
    type: Number,
    required: true,
  },
  userBalanceThreshold: {
    type: Number,
    required: true,
  },
  shareLimit: {
    type: Number,
    required: true,
  },
  shareLinkBase: {
    type: String,
    required: true,
  },
});

export default model<IWalletConfig>('wallet-config', walletConfigSchema);
