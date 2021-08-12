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