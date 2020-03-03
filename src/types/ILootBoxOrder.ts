export interface ILootBoxOrder {
  userId: string;
  quantity: number;
  totalBtc: number;
  txHash: string;
  isUpgradeOrder: boolean;
  itemsReceived: string[];
}
