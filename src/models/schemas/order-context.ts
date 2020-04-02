import { Schema } from 'mongoose';

export const orderContextSchema = new Schema({
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  utm_keyword: String,
  utm_term: String,
  referredBy: String,
  offer: String,
});
