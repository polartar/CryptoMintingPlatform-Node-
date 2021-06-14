import { bool } from "aws-sdk/clients/signer"

export interface IVault {
  symbol: string;
  name: string;
  icon: string;
  contractAddress: string;
  balance: string;
  fees: IVaultGasFee
}

export interface IVaultTransaction {
  userId: string;
  symbol: string;
  tokenId?: string;
  isNft: bool;
  amount: string;
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
