import { model, Document, Schema } from 'mongoose';
import { IDependent } from 'src/types';

export interface IDependentDocument extends IDependent, Document {}

export const DependentsSchema = new Schema({
  userId: String,
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  phoneNumber: String,
  country: String,
  clinic: String,
  careclixId: String,
  created: Date,
});

const Dependent = model<IDependentDocument>('Dependent', DependentsSchema);

export default Dependent;
