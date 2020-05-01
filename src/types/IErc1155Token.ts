export interface IErc1155Token {
  createdBy: string;
  tokenId: string;
  uri: string;
  name: string;
  description: string;
  image: string;
  decimals: string;
  nftBaseId: string;
  properties: {
    rarity: {
      icon: string;
      label: string;
      hexcode: string;
      supplyLimit: number;
    };
    game: string;
  };

  localization: {
    uri: string;
    default: string;
    locales: string[];
  };
}
