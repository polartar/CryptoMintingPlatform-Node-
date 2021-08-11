import { Document, HookNextFunction, model, Schema } from 'mongoose',

export interface WordpressDate {
  "date": string;
  "timezone_type": number;
  "timezone": string;
}

export interface OrderDetailMeta {
  id: number;
  key: string;
  value: string;
}

export interface ICartTransaction extends Document {
  "id": string,
  "parent_id": number,
  "status": string,
  "currency": string,
  "version": string,
  "prices_include_tax": boolean,
  "date_created": WordpressDate,
  "date_expire": WordpressDate,
  "discount_total": string,
  "discount_tax": string,
  "shipping_total": string,
  "shipping_tax": string,
  "cart_tax": string,
  "total": string,
  "total_tax": string,
  "customer_id": string,
  "order_key": string,
  "billing": any,
  "payment_method": string,
  "payment_method_title": string,
  "transaction_id": string,
  "customer_ip_address": string,
  "customer_user_agent": string,
  "created_via": string,
  "customer_note": string,
  "date_completed": WordpressDate,
  "date_paid": WordpressDate,
  "cart_hash": string,
  "number": string,
  "meta_data": OrderDetailMeta[],
  "line_items": any,
  "tax_lines": any[],
  "shipping_lines": any[],
  "fee_lines": any[],
  "coupon_lines": any[],
  "custom_field": any,
  "subscription": string,
  "membership": string,
  "name": string,
  "gateway": string,
}

export const orderDetailMetaSchema = new mongoose.Schema({
  id: String,
  key: Number,
  value: String,
});

export const wordpressDateSchema = new mongoose.Schema({
  "date": String,
  "timezone_type": Number,
  "timezone": String,
});

export const cartTransactionSchema = new Schema({
  "id":  { type: String, unique: true, index: true, trim: true },
  "parent_id": Number,
  "status": String,
  "currency": String,
  "version": String,
  "prices_include_tax": Boolean,
  "date_created": wordpressDateSchema,
  "date_expire": wordpressDateSchema,
  "discount_total": String,
  "discount_tax": String,
  "shipping_total": String,
  "shipping_tax": String,
  "cart_tax": String,
  "total": String,
  "total_tax": String,
  "customer_id": String,
  "order_key": String,
  "billing": Mixed,
  "payment_method": String,
  "payment_method_title": String,
  "transaction_id": String,
  "customer_ip_address": String,
  "customer_user_agent": String,
  "created_via": String,
  "customer_note": String,
  "date_completed": wordpressDateSchema,
  "date_paid": wordpressDateSchema,
  "cart_hash": String,
  "number": String,
  "meta_data": [orderDetailMetaSchema],
  "line_items": Mixed,
  "tax_lines": [Mixed],
  "shipping_lines": [Mixed],
  "fee_lines": [Mixed],
  "coupon_lines": [Mixed],
  "custom_field": Mixed,
  "subscription": String,
  "membership": String,
  "name": String,
  "gateway": String,
});

const CartTransaction = model<ICartTransaction>('cart-transaction', cartTransactionSchema);

export default CartTransaction;
