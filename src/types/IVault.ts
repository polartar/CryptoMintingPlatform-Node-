export interface IVault {
  symbol: string;
  name: string;
  icon: string;
  contractAddress: string;
  balance: number;
  fees: IVaultGasFee
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

export enum StatusResponse {
  Success,
  Error
}

export enum ErrorResponseCode {
  InvalidEncryptionPassword,
  BlockchainError,
  InternalError,
}

export interface IErrorResponse {
  message: String
  code: ErrorResponseCode,
  stack?: string,
}

export interface IVaultRetrieveResponseData {
  symbol: string,
  amount: number,
  transactionId: string,
}

export interface IVaultRetrieveResponse {
  data?: IVaultRetrieveResponseData,
  error?: IErrorResponse,
  status: StatusResponse,
}
