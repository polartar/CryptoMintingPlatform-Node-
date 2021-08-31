import { Schema, model, Document } from 'mongoose';

export interface ILicense extends Document {
  licenseTypeId: string;
  userId: string;
  created: Date;
  inUse: boolean;
  ownershipHistory: {
    receivedReason: string;
    received: Date;
  }[];
}

export const licenseSchema = new Schema({
  licenseTypeId: { type: String, index: true },
  userId: { type: String, index: true },
  created: Date,
  inUse: Boolean,
  ownershipHistory: [
    {
      receivedReason: String,
      received: Date,
    },
  ],
});

const License = model<ILicense>('license', licenseSchema);

export default License;
