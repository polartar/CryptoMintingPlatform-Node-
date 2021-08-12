import { Document, model, Schema } from 'mongoose';

export interface IWordpressDate {
  "date": String;
  "timezone_type": number;
  "timezone": String;
}

export interface IOrderDetailMeta {
  id: number;
  key: String;
  value: String;
}

export interface ICartTransaction extends Document {
  "id": String,
  "parent_id": number,
  "status": String,
  "currency": String,
  "version": String,
  "prices_include_tax": boolean,
  "date_created": IWordpressDate,
  "date_expire": IWordpressDate,
  "discount_total": String,
  "discount_tax": String,
  "shipping_total": String,
  "shipping_tax": String,
  "cart_tax": String,
  "total": String,
  "total_tax": String,
  "customer_id": String,
  "order_key": String,
  "billing": any,
  "payment_method": String,
  "payment_method_title": String,
  "transaction_id": String,
  "customer_ip_address": String,
  "customer_user_agent": String,
  "created_via": String,
  "customer_note": String,
  "date_completed": IWordpressDate,
  "date_paid": IWordpressDate,
  "cart_hash": String,
  "number": String,
  "meta_data": IOrderDetailMeta[],
  "line_items": any,
  "tax_lines": any[],
  "shipping_lines": any[],
  "fee_lines": any[],
  "coupon_lines": any[],
  "custom_field": any,
  "subscription": String,
  "membership": String,
  "name": String,
  "gateway": String,
};

export const cartTransactionSchema = new Schema({
  "id": String,
  "parent_id": Number,
  "userId": String,
  "status": String,
  "currency": String,
  "version": String,
  "gateway": String,
});


const CartTransaction = model<ICartTransaction>('cart-transaction', cartTransactionSchema);

export default CartTransaction;
