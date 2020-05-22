export interface IBuySellCoin {
  buyOrSell: string;
  base: string;
  quantity?: number;
  tokenId?: string;
  rel: string;
  price?: number;
}
