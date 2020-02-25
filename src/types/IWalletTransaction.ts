export interface IWalletTransaction {
  amount: string;
  blockNumber: number;
  from: string;
  fromUser: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  nftBaseId: string;
  nonce: number;
  status: string;
  swapId: string;
  symbol: string;
  timestamp: number;
  to: string;
  toUser: string;
  tokenId: string;
  transactionIndex: number;
}
