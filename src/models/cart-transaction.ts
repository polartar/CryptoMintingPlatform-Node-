import { Document, model, Schema } from 'mongoose';

export interface ICartTransaction {
  "wp_id": string,
  "status": string,
  "currency": string,
  "discount_total": string,
  "discount_tax": string,
  "total": string,
  "name": string,
  "email": string,
  "data": any;
};

export interface ICartTransactionDoc extends ICartTransaction, Document {};

export const cartTransactionSchema = new Schema({
  "wp_id": String,
  "status": String,
  "currency": String,
  "discount_total": String,
  "discount_tax": String,
  "total": String,
  "name": String,
  "email": String,
  "data": String,
});


const CartTransaction = model<ICartTransactionDoc>('cart-transaction', cartTransactionSchema);

export default CartTransaction;
