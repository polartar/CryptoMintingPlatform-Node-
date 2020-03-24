import { Schema, Document, model } from 'mongoose';
import { IUtmInfo } from '../../types';

export const utmSchema = new Schema<IUtmInfo>({
  medium: {
    type: String,
    default: '',
  },
  source: {
    type: String,
    default: '',
  },
  campaign: {
    type: String,
    default: '',
  },
  term: {
    type: String,
    default: '',
  },
});
