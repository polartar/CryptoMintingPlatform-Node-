export interface IVaultItem {
  symbol: string;
  name: string;
  icon: string;
  contractAddress: string;
  balance: number;
  fees: IVaultGasFee;
}

export interface IVaultTransaction {
  userId: string;
  symbol: string;
  tokenId?: string;
  isNft: boolean;
  amount: number;
  created: Date;
  status: string;
  dateMint?: Date;
  txMint?: string;
}

export interface IVaultGasFee {
  symbolToMint: string;
  symbolAcceptFee: string;
  amount: number;
  expires: Date;
  name: string;
}

export enum ErrorResponseCode {
  InvalidEncryptionPassword,
  BlockchainError,
  InternalError,
}

export interface IErrorResponse {
  message: string;
  code: ErrorResponseCode;
  stack?: string;
}

export interface IVaultRetrieveResponseData {
  symbol: string;
  amount: number;
  transactionId?: string;
  error?: IErrorResponse;
}

export interface IVaultItemRequest {
  symbol: string;
  amount: number;
}

export interface IVaultRetrieveResponse {
  data?: IVaultRetrieveResponseData[];
  error?: IErrorResponse;
}
