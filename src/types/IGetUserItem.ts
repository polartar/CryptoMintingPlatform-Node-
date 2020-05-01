export interface IGetUserItemResponse {
  id: string;
  name: string;
  game: string;
  description: string;
  image: string;
  icon: string;
  coin: string;
  galaFee: number;
  tradeWaitTime: number;
  withdrawalWaitTime: number;
  hexcode: string;
  label: string;
  items: {
    id: string;
    lootBoxId: string;
    gameItemId: string;
    dateAquired: number;
    aquisitionType: string;
  }[];
}
