export interface IGetFeeRequest {
  coin: string; // the name of the coin for the requested trade fee
}

export interface IGetFeeResponse {
  coin: string; // the fee will be paid from the user's balance of this coin. This coin name may differ from the requested coin. For example ERC20 fees are paid by ETH (gas)
  amount: number; // the approximate fee amount to be paid per swap transaction
  token_id: string;
  usdAmount: number;
}
export enum BuySell {
  Buy = 'Buy',
  Sell = 'Sell',
}

export interface IGetPrice {
  base: string;
  rel: string;
  tokenId?: string;
  quantityBase: number;
  buyOrSell: BuySell;
}

export interface IPrice {
  base: string;
  rel: string;
  token_id: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  usdValue: number;
}

export interface IGetPriceResponse {
  price: IPrice;
  fees: IGetFeeResponse;
}
