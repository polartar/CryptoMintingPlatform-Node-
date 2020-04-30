import { IWalletTransaction } from './IWalletTransaction';
import { IUniqueItem } from './IUniqueItem';

export interface IItem {
  description: string;
  image: string;
  name: string;
  game: string;
  nftBaseId: string;
  properties: {
    farmbot: { requiredQty: number };
    rarity: { icon: string; label: string; supplyLimit: number };
  };
  walletTransaction?: IWalletTransaction;
}
export enum SortBy {
  price = 'PRICE',
  date = 'DATE',
  nftBaseId = 'NFT-BASE-ID',
  // quantity = 'QUANTITY',
}
export enum HighOrLow {
  high = 1,
  low = -1,
}
export interface IItemQueryInput {
  base: string;
  rel: string;
  nftBaseId?: string;
  tokenId?: string;
  userId?: string;
  sortBy?: SortBy;
  highOrLow?: HighOrLow;
}
export interface IGetItemsResponse {
  nftBaseId: string;
  coin: string;
  token_id: string;
  seller: string;
  timestamp: number;
  listPrice: number;
}
export interface IGetAggregatedItemsResponse {
  nftBaseId: string;
  coin: string;
  quantity: number;
  avgPrice: number;
}

export interface IExchangeItem {
  id: string;
  game: string;
  name: string;
  nftBaseId?: string;
  coin: string;
  description?: string;
  image: string;
  icon: string;
  rarity?: { icon: string; label: string; supplyLimit: number };
  quantity: number;
  avgPrice: number;
  items: IUniqueItem[];
}
