import { model, Schema, Document } from 'mongoose';
import { ICartAddress } from 'src/types/ICartAddress';

export interface ICartAddressRequest {
  userId?: string;
  coinSymbol?: string;
  amountUsd?: string;
  amountCrypto?: string;
  orderId: string;
  affiliateId: string;
  affiliateSessionId: string;
  utmVariables: string;
  created: Date;
  addresses: ICartAddress[];
}

export interface ICartAddressRequestDocument
  extends ICartAddressRequest,
    Document {}

export const cartAddressSchema = new Schema({
  coinSymbol: String,
  address: String,
  qrCode: String,
});

export const cartAddresRequestSchema = new Schema({
  userId: { type: String, required: false, default: undefined },
  coinSymbol: { type: String, required: false, default: undefined },
  amount: { type: String, required: false, default: undefined },
  orderId: String,
  affiliateId: String,
  affiliateSessionId: String,
  utmVariables: String,
  created: Date,
  addresses: [cartAddressSchema]!,
});

const cartAddresRequestModel = model<ICartAddressRequestDocument>(
  'Cart-address-request',
  cartAddresRequestSchema,
);

export default cartAddresRequestModel;
