import { Document, model, Schema } from 'mongoose';

export interface ICartTransaction {
  wp_id: string;
  status: string;
  currency: string;
  discountAmtUsd: string;
  totalUsd: string;
  totalCrypto: string;
  totalCryptoReceived: number;
  conversionRate: string;
  remainingCrypto: string;
  address: string;
  name: string;
  email: string;
  data: string;
  created: Date;
  redisKey: string;
  redisValue: string;
}

export interface ICartTransactionDoc extends ICartTransaction, Document {}

export const cartTransactionSchema = new Schema({
  wp_id: String,
  status: String,
  currency: String,
  discountAmtUsd: String,
  totalUsd: String,
  totalCrypto: String,
  conversionRate: String,
  remainingCrypto: String,
  address: String,
  name: String,
  email: String,
  data: String,
  created: Date,
});

const CartTransaction = model<ICartTransactionDoc>(
  'cart-transaction',
  cartTransactionSchema,
);

export default CartTransaction;
