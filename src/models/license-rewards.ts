import { Schema, model, Document } from 'mongoose';

export interface ILicenseRewardsDoc extends Document {
  rewardType: string;
  rewardName: string;
  amount: number;
  created: Date;
  userId: string;
  environmentType: string;
}

export const licenseRewardSchema = new Schema({
  rewardName: String,
  amount: Number,
  created: Date,
  userId: String,
  rewardType: String,
  environmentType: String,
});

licenseRewardSchema.pre('save', async function(this: ILicenseRewardsDoc, next) {
  const licenseReward = this;
  if (!licenseReward.created) {
    licenseReward.created = new Date();
  }
  next();
});

const LicenseRewards = model<ILicenseRewardsDoc>(
  'license-rewards',
  licenseRewardSchema,
);

export default LicenseRewards;
