export interface AssignedNode {
  hardwareId: string;
  licenseId: string;
  ethAddress: string;
  userId: string;
}

export interface SpecificTransactionProperties {
  returnedEth?: string;
  returnedEthHex?: string;
  returnedEthDecimals?: number;
  returnedEthDecimalsStored?: number;
  baseId?: string;
  tokenId?: string;
  logIndex?: number | null;
  nft?: boolean;
  contractName?: string;
  contractMethod?: string;
  mintTransaction?: boolean;
  assignedNode?: AssignedNode;
}

export enum TransactionType {
  Eth = 'ETH',
  Erc1155 = 'ERC-1155',
  Erc20 = 'ERC-20',
  ExternalContract = 'ExternalContract',
}

export interface IWalletTransaction extends SpecificTransactionProperties {
  type: TransactionType;
  status: string;
  timestamp: number;
  to: string;
  from: string;
  operator: string;
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
}
