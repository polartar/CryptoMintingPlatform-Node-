export interface IWalletTransaction {
  type: string; //
  status: string;
  timestamp: number;
  to: string;
  from: string;
  amount: number | string;
  fullHexAmount: string;
  decimalsStored: number;
  blockNumber: number | null;
  gasPriceHex: string;
  gasUsedHex: string;
  gasPrice: string | number;
  gasUsed: string | number;
  gasPriceDecimals: number;
  hash: string;
  nonce: number;
  toUser: string;
  fromUser: string;
  baseId?: string;
  tokenId?: string;
  logIndex?: number | null;
  batchIndex?: number | null;
  batchCount?: number;
  nft?: boolean;
  contractMethod?: string;
  contractType?: string;
  mintTransaction?: boolean;
  assignedNode?: {
    hardwareId: string;
    licenseId: string;
    ethAddress: string;
    userId: string;
  };
}
