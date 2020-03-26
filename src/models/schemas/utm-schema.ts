import { Schema } from 'mongoose';
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
  content: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
});
