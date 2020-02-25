import { IWalletTransaction } from './IWalletTransaction';

export interface IItem {
  description: string;
  image: string;
  name: string;
  nftBaseId: string;
  properties: {
    farmbot: { requiredQty: number };
    rarity: { image: string; label: string; supplyLimit: number };
  };
  walletTransaction?: IWalletTransaction;
}
