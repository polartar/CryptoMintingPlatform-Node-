import { Types } from 'mongoose';

export interface IGameOrder {
  userId: string;
  quantity: number;
  perUnitPriceUsd: number;
  gameProductId: Types.ObjectId | string;
  btcUsdPrice: number;
  totalBtc: number;
  txHash: string;
  isUpgradeOrder: boolean;
  itemsReceived: string[];
  created: Date;
}
