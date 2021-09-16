export interface ICartAddress {
  coinSymbol: string;
  address: string;
  qrCode: string;
}

export interface ICartBalance {
  coinSymbol: string;
  address: string;
  amountConfirmed: number;
  amountUnconfirmed: number;
  lastTransactions: ICartBalanceTransaction[];
}

export interface ICartBalanceTransaction {
  tx: string;
  created: string;
  confirmations: number;
}

export enum CartStatus {
  complete,
  insufficient,
  pending,
  expired,
  found,  
}

export enum CartType {
  woocommerce,
  memberpress,
}

export interface CartRedisKey {
  symbol: string;
  brand: string;
  orderId: string;
  orderType: CartType;
}

export interface ICartWatcherData {
  address: string;
  exp: Date;
  affiliateId: string;
  affiliateSessionId: string;
  utmVariables: string;
  status: string;
  crytoAmount: number;
  crytoAmountRemaining: number;
  usdAmount: number;
  meprTxData?: string;
  wooTxData?: string;
  dbId?: string;
}
