import { Schema, model, Document } from 'mongoose';

export interface ILicenseDoc extends Document {
  userId: string;
}

export const licenseSchema = new Schema({
  userId: String,
});

const License = model<ILicenseDoc>('license', licenseSchema);

export default License;
